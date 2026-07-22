const {
    exec: exec
} = require("child_process"), fs = require("fs"), https = require("https"), path = require("path");
fs.existsSync(".env") && fs.readFileSync(".env", "utf-8").split(/\r?\n/).forEach(e => {
    const n = e.trim();
    if (!n) return;
    const r = n.split("#")[0].trim();
    if (!r) return;
    const [s, ...t] = r.split("=");
    s && (process.env[s.trim()] = t.join("=").trim())
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

function fetchRepos(e = 1, n = []) {
    1 === e && startSpinner("리포지토리 목록을 가져오는 중...");
    const r = {
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
        s = https.get(r, r => {
            let s = "";
            r.on("data", e => {
                s += e
            }), r.on("end", () => {
                if (200 === r.statusCode) try {
                    const r = JSON.parse(s);
                    if (0 === r.length) return stopSpinner(), void processCloning(n);
                    fetchRepos(e + 1, n.concat(r))
                } catch (e) {
                    stopSpinner(), console.error("데이터 파싱 중 에러 발생:", e.message)
                } else {
                    stopSpinner(), console.error(`API 요청 실패 (상태 코드: ${r.statusCode})`);
                    try {
                        const e = JSON.parse(s);
                        console.error(`메시지: ${e.message}`)
                    } catch (e) {
                        console.error(s)
                    }
                }
            })
        }).on("error", e => {
            stopSpinner(), console.error("네트워크 오류 발생:", e.message)
        }).on("timeout", () => {
            s.destroy(), stopSpinner(), console.error("API 요청 시간이 초과되었습니다.")
        })
}

function cloneRepository(e, n, r) {
    return new Promise(n => {
        const r = e.name,
            s = path.join(TARGET_DIR, r);
        fs.existsSync(s) ? n({
            repoName: r,
            success: !0,
            skipped: !0
        }) : exec(`git clone "https://${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${r}.git" "${s}"`, {
            timeout: 3e5
        }, e => {
            n(e ? {
                repoName: r,
                success: !1,
                error: e.message
            } : {
                repoName: r,
                success: !0,
                skipped: !1
            })
        })
    })
}

function processCloning(e) {
    const n = e.filter(e => !e.fork),
        r = n.length;
    if (console.log(`총 ${e.length}개의 리포지토리 중 오리지널 리포지토리 ${r}개를 찾았습니다.\n`), 0 === r) return void console.log("작업 완료");
    let s = 0;
    startSpinner(`클론 진행 중... [0/${r}]`);
    const t = n.map((e, n) => cloneRepository(e, n, r).then(e => (s++, updateSpinner(`클론 진행 중... [${s}/${r}]`), e)));
    Promise.all(t).then(e => {
        stopSpinner(), console.log("--- 세부 결과 ---"), e.forEach(e => {
            e.skipped ? console.log(`[-] ${e.repoName} (이미 폴더가 존재하여 건너뜀)`) : e.success ? console.log(`[V] ${e.repoName} 클론 완료`) : console.log(`[X] ${e.repoName} 클론 실패`)
        }), console.log("\n작업 완료")
    }).catch(e => {
        stopSpinner(), console.error("병렬 처리 중 예기치 못한 치명적 오류 발생:", e.message)
    })
}
fetchRepos();
