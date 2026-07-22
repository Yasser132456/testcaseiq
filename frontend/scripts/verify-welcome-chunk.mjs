import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const normalize = (value) => value.replaceAll('\\', '/');

export function verifyWelcomeStats(baselineStats, candidateStats) {
  const baseline = inspectStats(baselineStats);
  const candidate = inspectStats(candidateStats);
  const initialDelta = candidate.initial.bytes - baseline.initial.bytes;
  const welcomeDelta = candidate.welcome.bytes - baseline.welcome.bytes;

  if (initialDelta > 0) {
    throw new Error(`Shared main bundle grew by ${initialDelta} ${initialDelta === 1 ? 'byte' : 'bytes'}.`);
  }
  if (!candidate.welcome.lazy) {
    throw new Error('Welcome code is no longer isolated in a lazy output.');
  }
  if (candidate.welcome.threeModules.length > 0) {
    throw new Error(`Three.js is present in the welcome chunk: ${candidate.welcome.threeModules.join(', ')}`);
  }

  return {
    initial: {
      baselineBytes: baseline.initial.bytes,
      candidateBytes: candidate.initial.bytes,
      deltaBytes: initialDelta,
      output: candidate.initial.output
    },
    welcome: {
      baselineBytes: baseline.welcome.bytes,
      candidateBytes: candidate.welcome.bytes,
      deltaBytes: welcomeDelta,
      lazy: candidate.welcome.lazy,
      output: candidate.welcome.output,
      threeModuleCount: candidate.welcome.threeModules.length
    }
  };
}

function inspectStats(stats) {
  const outputs = Object.entries(stats.outputs ?? {});
  const initial = outputs.find(([, output]) => normalize(output.entryPoint ?? '') === 'src/main.ts');
  const welcome = outputs.find(([, output]) =>
    normalize(output.entryPoint ?? '').endsWith('src/app/pages/welcome/welcome-page.component.ts')
  );
  if (!initial) throw new Error('Angular stats do not contain the shared main entry output.');
  if (!welcome) throw new Error('Angular stats do not contain a lazy welcome entry output.');

  const [initialName, initialOutput] = initial;
  const [welcomeName, welcomeOutput] = welcome;
  const welcomeInputs = Object.keys(welcomeOutput.inputs ?? {}).map(normalize);
  const initialInputs = Object.keys(initialOutput.inputs ?? {}).map(normalize);
  const threeModules = welcomeInputs.filter((input) => /node_modules\/three\/|\/three(?:\.module)?\.[cm]?js$/i.test(input));
  const welcomeSourceInMain = initialInputs.some((input) => input.includes('/pages/welcome/'));

  return {
    initial: { bytes: initialOutput.bytes, output: initialName },
    welcome: {
      bytes: welcomeOutput.bytes,
      lazy: initialName !== welcomeName && !welcomeSourceInMain,
      output: welcomeName,
      threeModules
    }
  };
}

function renderReport(result) {
  return `# Welcome S4 bundle report

| Bundle | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| Shared main (\`${result.initial.output}\`) | ${result.initial.baselineBytes} B | ${result.initial.candidateBytes} B | ${signed(result.initial.deltaBytes)} B |
| Lazy welcome (\`${result.welcome.output}\`) | ${result.welcome.baselineBytes} B | ${result.welcome.candidateBytes} B | ${signed(result.welcome.deltaBytes)} B |

- Welcome route remains lazy-loaded: **${result.welcome.lazy ? 'yes' : 'no'}**
- Three.js modules in the welcome chunk: **${result.welcome.threeModuleCount}**
- Deleted Three.js welcome branch is absent from the welcome chunk: **${result.welcome.threeModuleCount === 0 ? 'confirmed' : 'not confirmed'}**
`;
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing required ${name} argument.`);
  return process.argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const basePath = argument('--base');
  const candidatePath = argument('--candidate');
  const reportPath = argument('--report');
  const result = verifyWelcomeStats(
    JSON.parse(readFileSync(basePath, 'utf8')),
    JSON.parse(readFileSync(candidatePath, 'utf8'))
  );
  writeFileSync(reportPath, renderReport(result), 'utf8');
  process.stdout.write(`${renderReport(result)}\n`);
}
