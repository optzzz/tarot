// 打包安卓外壳 APK：不用 Gradle，直接用 vendor/ 里的 JDK 和 build-tools（aapt2 → javac → d8 → zipalign → apksigner）。
// 先运行 `npm run android:setup` 下载工具。输出 android/build/tarot-<版本>.apk。
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { emblem } from './emblem.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'android');
const OUT = path.join(APP, 'build');
const VENDOR = path.join(ROOT, 'vendor');
const JDK = path.join(VENDOR, 'jdk');
const BT = path.join(VENDOR, 'android-sdk', 'build-tools', '37.0.0');
const ANDROID_JAR = path.join(VENDOR, 'android-sdk', 'platforms', 'android-36', 'android.jar');
const MIN_SDK = 24;
const TARGET_SDK = 36;

const java = path.join(JDK, 'bin', 'java.exe');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const exists = p => fs.access(p).then(() => true, () => false);

for (const p of [java, ANDROID_JAR, path.join(BT, 'aapt2.exe')]) {
  if (!(await exists(p))) throw new Error(`缺少 ${p}，先运行 npm run android:setup`);
}

const version = JSON.parse(await fs.readFile(path.join(APP, 'version.json'), 'utf8'));
await fs.rm(OUT, { recursive: true, force: true });
for (const d of ['gen-res', 'compiled', 'classes', 'dex']) await fs.mkdir(path.join(OUT, d), { recursive: true });

// ---------- 1. 启动图标（与网页图标同一个图案） ----------
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const bgSvg = n => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}">
<defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#252b55"/><stop offset="1" stop-color="#0c0f22"/></radialGradient></defs>
<rect width="${n}" height="${n}" fill="url(#g)"/></svg>`;
// 自适应图标 108dp，图案半径 27dp，落在 66dp 的安全区内并留出余量
const fgSvg = (n, color) => {
  const s = (n * 27 / 108) / 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}">
<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">${emblem(n / 2, n / 2, s, s * 2, color)}</g></svg>`;
};
const legacySvg = n => {
  const s = (n * 0.4) / 58;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}">
<defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#252b55"/><stop offset="1" stop-color="#0c0f22"/></radialGradient></defs>
<rect width="${n}" height="${n}" rx="${n * 0.2}" fill="url(#g)"/>
<g fill="none" stroke="#c9a96a" stroke-linecap="round" stroke-linejoin="round">${emblem(n / 2, n / 2, s, s * 1.8)}</g></svg>`;
};
// 先按 4 倍尺寸渲染再缩小，边缘抗锯齿更细
const png = (svg, size, file) => sharp(Buffer.from(svg), { density: 72 * 4 }).resize(size, size).png().toFile(file);

for (const [name, k] of Object.entries(DENSITIES)) {
  const dir = path.join(OUT, 'gen-res', `mipmap-${name}`);
  await fs.mkdir(dir, { recursive: true });
  const a = Math.round(108 * k), l = Math.round(48 * k);
  await png(bgSvg(a), a, path.join(dir, 'ic_launcher_bg.png'));
  await png(fgSvg(a, '#c9a96a'), a, path.join(dir, 'ic_launcher_fg.png'));
  await png(fgSvg(a, '#ffffff'), a, path.join(dir, 'ic_launcher_mono.png'));
  await png(legacySvg(l), l, path.join(dir, 'ic_launcher.png'));
}

// ---------- 2. 资源编译与链接 ----------
const aapt2 = path.join(BT, 'aapt2.exe');
run(aapt2, ['compile', '--dir', path.join(APP, 'res'), '-o', path.join(OUT, 'compiled', 'res.zip')]);
run(aapt2, ['compile', '--dir', path.join(OUT, 'gen-res'), '-o', path.join(OUT, 'compiled', 'gen.zip')]);
const baseApk = path.join(OUT, 'base.apk');
run(aapt2, ['link', '-I', ANDROID_JAR, '--manifest', path.join(APP, 'AndroidManifest.xml'),
  '--min-sdk-version', String(MIN_SDK), '--target-sdk-version', String(TARGET_SDK),
  '--version-code', String(version.code), '--version-name', version.name,
  '-o', baseApk, path.join(OUT, 'compiled', 'res.zip'), path.join(OUT, 'compiled', 'gen.zip')]);

// ---------- 3. Java 编译成 dex ----------
async function listFiles(dir, ext) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await listFiles(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const sources = await listFiles(path.join(APP, 'java'), '.java');
// android.jar 不含 lambda 需要的 LambdaMetafactory，build-tools 自带了对应的桩文件
run(path.join(JDK, 'bin', 'javac.exe'), ['-J-Duser.language=en', '-source', '8', '-target', '8', '-Xlint:-options', '-encoding', 'UTF-8',
  '-bootclasspath', ANDROID_JAR, '-classpath', path.join(BT, 'core-lambda-stubs.jar'), '-d', path.join(OUT, 'classes'), ...sources]);
const classes = await listFiles(path.join(OUT, 'classes'), '.class');
run(java, ['-cp', path.join(BT, 'lib', 'd8.jar'), 'com.android.tools.r8.D8', '--release', '--min-api', String(MIN_SDK),
  '--lib', ANDROID_JAR, '--output', path.join(OUT, 'dex'), ...classes]);

// ---------- 4. 把 dex 放进 APK（保留 aapt2 定下的压缩方式，resources.arsc 必须不压缩） ----------
const unaligned = path.join(OUT, 'unaligned.apk');
run('python', ['-c', `
import sys, zipfile
src, dst, dex = sys.argv[1:4]
with zipfile.ZipFile(src) as zi, zipfile.ZipFile(dst, 'w') as zo:
    for info in zi.infolist():
        zo.writestr(info, zi.read(info.filename), compress_type=info.compress_type)
    zo.write(dex, 'classes.dex', compress_type=zipfile.ZIP_DEFLATED)
`, baseApk, unaligned, path.join(OUT, 'dex', 'classes.dex')]);
const aligned = path.join(OUT, 'aligned.apk');
run(path.join(BT, 'zipalign.exe'), ['-f', '4', unaligned, aligned]);

// ---------- 5. 签名（签名文件只在本机，丢了以后就无法覆盖升级） ----------
const ks = path.join(APP, 'release.keystore');
const propsFile = path.join(APP, 'keystore.properties');
if (!(await exists(ks))) {
  const pass = crypto.randomBytes(18).toString('base64url');
  run(path.join(JDK, 'bin', 'keytool.exe'), ['-genkeypair', '-keystore', ks, '-storetype', 'PKCS12', '-alias', 'tarot',
    '-keyalg', 'RSA', '-keysize', '2048', '-validity', '36500', '-storepass', pass, '-keypass', pass,
    '-dname', 'CN=Tarot, O=optzzz'], { stdio: 'ignore' });
  await fs.writeFile(propsFile, `storePassword=${pass}\nkeyAlias=tarot\n`);
  console.log('已生成签名文件 android/release.keystore（请备份，连同 keystore.properties）');
}
const props = Object.fromEntries((await fs.readFile(propsFile, 'utf8')).trim().split('\n').map(l => l.split('=')));
const apk = path.join(OUT, `tarot-${version.name}.apk`);
const apksigner = ['-jar', path.join(BT, 'lib', 'apksigner.jar')];
run(java, [...apksigner, 'sign', '--ks', ks, '--ks-key-alias', props.keyAlias, '--ks-pass', `pass:${props.storePassword}`,
  '--key-pass', `pass:${props.storePassword}`, '--out', apk, aligned]);
run(java, [...apksigner, 'verify', '--min-sdk-version', String(MIN_SDK), apk]);

const size = (await fs.stat(apk)).size;
console.log(`\n完成：${path.relative(ROOT, apk)}（${(size / 1024).toFixed(0)} KB，版本 ${version.name} / ${version.code}）`);
