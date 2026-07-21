import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function summarizeInitialJavaScript(stats) {
  const outputs = Object.entries(stats.outputs ?? {});
  const lazyOutputs = new Set(
    outputs.flatMap(([, output]) => (output.imports ?? [])
      .filter((item) => item.kind === 'dynamic-import')
      .map((item) => item.path)),
  );
  const initialOutputs = outputs.filter(([name, output]) => (
    name.endsWith('.js') && output.entryPoint && !lazyOutputs.has(name)
  ));

  return {
    bytes: initialOutputs.reduce((total, [, output]) => total + output.bytes, 0),
    outputs: initialOutputs.map(([name]) => name),
  };
}

export function compareBundleStats(base, candidate, maxGrowthPercent) {
  const baseSummary = summarizeInitialJavaScript(base);
  const candidateSummary = summarizeInitialJavaScript(candidate);
  const deltaBytes = candidateSummary.bytes - baseSummary.bytes;
  const deltaPercent = baseSummary.bytes === 0
    ? (candidateSummary.bytes === 0 ? 0 : Infinity)
    : (deltaBytes / baseSummary.bytes) * 100;

  return {
    base: baseSummary,
    candidate: candidateSummary,
    deltaBytes,
    deltaPercent,
    maxGrowthPercent,
    passed: deltaPercent <= maxGrowthPercent,
  };
}

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!['--base', '--candidate', '--max-growth', '--report'].includes(option) || !value) {
      throw new Error('Usage: --base <stats.json> --candidate <stats.json> --max-growth <percent> --report <report.md>');
    }
    values[option] = value;
  }
  if (Object.keys(values).length !== 4) {
    throw new Error('Usage: --base <stats.json> --candidate <stats.json> --max-growth <percent> --report <report.md>');
  }
  return values;
}

function formatReport(result) {
  return `# Bundle Size Comparison\n\n| Metric | Value |\n| --- | ---: |\n| Base bytes | ${result.base.bytes} |\n| Candidate bytes | ${result.candidate.bytes} |\n| Delta bytes | ${result.deltaBytes} |\n| Growth | ${result.deltaPercent.toFixed(2)}% |\n| Result | ${result.passed ? 'PASS' : 'FAIL'} |\n`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [base, candidate] = await Promise.all([
    readFile(options['--base'], 'utf8').then(JSON.parse),
    readFile(options['--candidate'], 'utf8').then(JSON.parse),
  ]);
  const result = compareBundleStats(base, candidate, Number(options['--max-growth']));
  const report = formatReport(result);
  await mkdir(dirname(options['--report']), { recursive: true });
  await writeFile(options['--report'], report);
  process.stdout.write(report);
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
