const {
    exec: exec
} = require("child_process"), fs = require("fs"), https = require("https"), path = require("path");
fs.existsSync(".env") && fs.readFileSync(".env", "utf-8").split(/\r?\n/).forEach(e => {
    let t = e.trim();
    if (!t) return;
    let n = t.split("#")[0].trim();
    if (!n) return;
    let [r, ...s] = n.split("=");
    if (r) {
        let i = s.join("=").trim();
        (i.startsWith('"') && i.endsWith('"') || i.startsWith("'") && i.endsWith("'")) && (i = i.slice(1, -1)), process.env[r.trim()] = i
    }
});
const GITHUB_USERNAME = process.env.GITHUB_USERNAME,
    GITHUB_TOKEN = process.env.GITHUB_TOKEN,
    TARGET_DIR = process.env.TARGET_DIR || "./minirang";
let spinnerInterval;
GITHUB_USERNAME && GITHUB_TOKEN || (console.error("에러: .env 파일에 GITHUB_USERNAME과 GITHUB_TOKEN을 설정해야 합니다."), process.exit(1)), fs.existsSync(TARGET_DIR) || fs.mkdirSync(TARGET_DIR, {
    recursive: !0
});
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIndex = 0,
    currentStatusText = "";

function startSpinner(e) {
    currentStatusText = e, clearInterval(spinnerInterval), spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${spinnerFrames[spinnerIndex]} ${currentStatusText}`), spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length
    }, 80)
}

function updateSpinner(e) {
    currentStatusText = e
}

function stopSpinner() {
    clearInterval(spinnerInterval), process.stdout.write("\r\x1b[K")
}

function fetchRepos(e = 1, t = []) {
    1 === e && startSpinner("리포지토리 목록을 가져오는 중...");
    let n = {
            hostname: "api.github.com",
            path: `/user/repos?per_page=100&page=${e}&type=owner`,
            method: "GET",
            headers: {
                "User-Agent": "NodeJS-Clone-Script",
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github.v3+json"
            },
            timeout: 3e4
        },
        r = https.get(n, n => {
            let r = "";
            n.on("data", e => {
                r += e
            }), n.on("end", () => {
                if (200 === n.statusCode) try {
                    let s = JSON.parse(r);
                    if (!Array.isArray(s)) throw Error("데이터 파싱 결과가 배열이 아닙니다.");
                    let i = t.concat(s);
                    if (s.length < 100) return stopSpinner(), void processCloning(i);
                    fetchRepos(e + 1, i)
                } catch (o) {
                    stopSpinner(), console.error("데이터 파싱 중 에러 발생:", o.message)
                } else {
                    stopSpinner(), console.error(`API 요청 실패 (상태 코드: ${n.statusCode})`);
                    try {
                        let p = JSON.parse(r);
                        console.error(`메시지: ${p.message}`)
                    } catch (a) {
                        console.error(r)
                    }
                }
            })
        }).on("error", e => {
            stopSpinner(), console.error("네트워크 오류 발생:", e.message)
        }).on("timeout", () => {
            r.destroy(), stopSpinner(), console.error("API 요청 시간이 초과되었습니다.")
        })
}

function cloneRepository(e) {
    return new Promise(t => {
        let n = e.name,
            r = path.join(TARGET_DIR, n),
            s = e.full_name || `${GITHUB_USERNAME}/${n}`;
        fs.existsSync(r) ? t({
            repoName: n,
            success: !0,
            skipped: !0
        }) : exec(`git clone "https://${encodeURIComponent(GITHUB_TOKEN)}@github.com/${s}.git" "${r}"`, {
            timeout: 3e5,
            maxBuffer: 10485760
        }, e => {
            let r = e ? e.message : "";
            r && GITHUB_TOKEN && (r = r.split(GITHUB_TOKEN).join("***").split(encodeURIComponent(GITHUB_TOKEN)).join("***")), t(e ? {
                repoName: n,
                success: !1,
                error: r
            } : {
                repoName: n,
                success: !0,
                skipped: !1
            })
        })
    })
}
async function processCloning(e) {
    let t = e.filter(e => !e.fork),
        n = t.length;
    if (console.log(`총 ${e.length}개의 리포지토리 중 오리지널 리포지토리 ${n}개를 찾았습니다.
`), 0 === n) return void console.log("작업 완료");
    let r = 0;
    startSpinner(`클론 진행 중... [0/${n}]`);
    let s = Array(n),
        i = t.map((e, t) => ({
            item: e,
            i: t
        })),
        o = async () => {
            for (; i.length > 0;) {
                let e = i.shift();
                if (!e) break;
                let t = await cloneRepository(e.item);
                updateSpinner(`클론 진행 중... [${++r}/${n}]`), s[e.i] = t
            }
        }, p = Array.from({
            length: Math.min(5, n)
        }, o);
    await Promise.all(p), stopSpinner(), console.log("--- 세부 결과 ---"), s.forEach(e => {
        e.skipped ? console.log(`[-] ${e.repoName} (이미 폴더가 존재하여 건너뜀)`) : e.success ? console.log(`[V] ${e.repoName} 클론 완료`) : console.log(`[X] ${e.repoName} 클론 실패`)
    }), console.log("\n작업 완료")
}
fetchRepos();