// 下载安卓打包所需的最小工具集到 vendor/（不装进系统、不进 git）：
// JDK 21（Temurin）、Android 平台 android.jar、build-tools（aapt2 / d8 / zipalign / apksigner）。
// 已存在的会跳过；下载后校验官方给出的校验值。
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const VENDOR = path.join(ROOT, 'vendor');
const DL = path.join(VENDOR, '_downloads');
const SDK = path.join(VENDOR, 'android-sdk');

export const PLATFORM = 'android-36';
export const BUILD_TOOLS = '37.0.0';

const exists = p => fs.access(p).then(() => true, () => false);

async function download(url, file, algo, expected) {
  if (await exists(file)) {
    const h = createHash(algo).update(await fs.readFile(file)).digest('hex');
    if (h === expected) return;
  }
  process.stdout.write(`下载 ${path.basename(file)} … `);
  // 用系统 curl 下载：Node 自带的 fetch 在本机网络下连 GitHub 文件服务器会超时
  execFileSync('curl', ['-fL', '--retry', '3', '--connect-timeout', '30', '-s', '-o', file, url], { stdio: 'inherit' });
  const buf = await fs.readFile(file);
  const h = createHash(algo).update(buf).digest('hex');
  if (h !== expected) throw new Error(`校验失败 ${path.basename(file)}：${h} ≠ ${expected}`);
  await fs.writeFile(file, buf);
  console.log(`${(buf.length / 1048576).toFixed(0)} MB，校验通过`);
}

function unzip(zip, dest) {
  // 用 Windows 自带的 bsdtar；Git 带的 GNU tar 会把 "E:" 当成远程主机
  const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
  execFileSync(tar, ['-xf', zip, '-C', dest], { stdio: 'inherit' });
}

await fs.mkdir(DL, { recursive: true });
await fs.mkdir(SDK, { recursive: true });

// ---- JDK ----
const jdkDir = path.join(VENDOR, 'jdk');
if (!(await exists(path.join(jdkDir, 'bin', 'javac.exe')))) {
  const meta = await (await fetch('https://api.adoptium.net/v3/assets/latest/21/hotspot?os=windows&architecture=x64&image_type=jdk&vendor=eclipse')).json();
  const pkg = meta[0].binary.package;
  const zip = path.join(DL, pkg.name);
  await download(pkg.link, zip, 'sha256', pkg.checksum);
  const tmp = path.join(VENDOR, '_jdk_tmp');
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp);
  unzip(zip, tmp);
  const [inner] = await fs.readdir(tmp);
  await fs.rm(jdkDir, { recursive: true, force: true });
  await fs.rename(path.join(tmp, inner), jdkDir);
  await fs.rm(tmp, { recursive: true, force: true });
}

// ---- Android 平台与 build-tools（从官方仓库清单取地址和 SHA-1） ----
const repo = await (await fetch('https://dl.google.com/android/repository/repository2-3.xml')).text();
function archiveOf(pkgPath) {
  const start = repo.indexOf(`path="${pkgPath}"`);
  if (start < 0) throw new Error('仓库里没有 ' + pkgPath);
  const block = repo.slice(start, repo.indexOf('</remotePackage>', start));
  const archives = [...block.matchAll(/<archive>([\s\S]*?)<\/archive>/g)].map(m => m[1]);
  const pick = archives.find(a => !a.includes('<host-os>') || a.includes('<host-os>windows</host-os>'));
  const url = pick.match(/<url>(.*?)<\/url>/)[1];
  const sha1 = pick.match(/<checksum[^>]*>(.*?)<\/checksum>/)[1];
  return { url: 'https://dl.google.com/android/repository/' + url, sha1, name: url };
}

async function sdkPackage(pkgPath, destRel) {
  const dest = path.join(SDK, destRel);
  if (await exists(dest)) return;
  const a = archiveOf(pkgPath);
  const zip = path.join(DL, a.name);
  await download(a.url, zip, 'sha1', a.sha1);
  const tmp = path.join(SDK, '_tmp');
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp);
  unzip(zip, tmp);
  const [inner] = await fs.readdir(tmp);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rename(path.join(tmp, inner), dest);
  await fs.rm(tmp, { recursive: true, force: true });
}

await sdkPackage(`platforms;${PLATFORM}`, path.join('platforms', PLATFORM));
await sdkPackage(`build-tools;${BUILD_TOOLS}`, path.join('build-tools', BUILD_TOOLS));

// 安装包下载完就不需要了
await fs.rm(DL, { recursive: true, force: true });
console.log('工具就绪：', VENDOR);
