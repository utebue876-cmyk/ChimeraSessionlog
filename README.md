<h1 align="center">Chimera</h1>
<p align="center">An application for building a health record system on Medplum.</p>
<p align="center">
<a href="https://github.com/medplum/medplum-hello-world/blob/main/LICENSE.txt">
    <img src="https://img.shields.io/badge/license-Apache-blue.svg" />
  </a>
</p>

The recommended editor to use for this app is Visual Studio Code.

Extensions you should install:

- Prettier - Code formatter (/package.json lines 15-21)
- ESLint (/eslint.config.js)
- Simple React Snippets

Git must be installed. To check that you have it use the following command:

```bash
git --verson
```

If it's not recognised, git isn't installed (or isn't on PATH):

```bash
winget install --id Git.Git -e --source winget
```

After installing, close then reopen the terminal and rerun:

```bash
git --version
```

Install the dependencies:

```bash
npm install
```

Then, run the app

```bash
npm run dev
```

This app should run on `http://localhost:3000/`

If you would like to run debug sessions enabling breakpoints to work from within VS Code (instead of Chrome itself) you will need follow these steps.

1. Create a .vscode folder in the root folder.
2. Create a launch.json file within the .vscode folder and paste in the following code:

```bash
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "request": "launch",
      "type": "chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    },
    {
      "name": "Launch Edge",
      "request": "launch",
      "type": "msedge",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

3. The 'npm run dev' command must be running. Click on the Run and Debug (Ctrl+Shift+D) button in the left panel. Next click the > Launch Chrome button which appears at the top of the left panel. A new Chrome window will appear and you will then be in debug mode enabling you to add new breakpoints from within VS Code, step though the code viewing/chaning variables as you go.

To run your vitests:

```bash
npm test
```

To run EsLint (which will find any TypeScript errors):

```bash
npm run lint
```

To run a build before pushing the code to the server:

```bash
npm run build
```

### About Medplum

[Medplum](https://www.medplum.com/) is an open-source, API-first EHR. Medplum makes it easy to build healthcare apps quickly with less code.

Medplum supports self-hosting and provides a [hosted service](https://app.medplum.com/). Medplum Hello World uses the hosted service as a backend.

- Read our [documentation](https://www.medplum.com/docs)
- Browse our [react component library](https://storybook.medplum.com/)
- Join our [Discord](https://discord.gg/medplum)
