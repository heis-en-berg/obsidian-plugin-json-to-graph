import { Plugin, TFile } from "obsidian";

const jsonData = [
  {
    title: "Project Alpha",
    folder: "Tech graph/Alpha",
    content: "This is project alpha.",
    links: ["Project Beta", "Project Gamma"]
  },
  {
    title: "Project Beta",
    folder: "Tech graph/Beta",
    content: "This is project beta.",
    links: ["Project Alpha"]
  },
  {
    title: "Project Gamma",
    folder: "Tech graph/Gamma",
    content: "This is project gamma.",
    links: ["Project Alpha"]
  }
];


export default class JSONFileGraphPlugin extends Plugin {
  async onload() {
    console.debug("JSON File Graph Plugin loaded");

    this.addCommand({
      id: "generate-json-graph",
      name: "Generate notes from JSON graph",
      callback: async () => {
        await this.generateGraph(jsonData);
      }
    });
  }

  async generateGraph(data: typeof jsonData) {
    const createdFiles: Record<string, TFile> = {};

    // Step 1: Create or reuse files
    for (const item of data) {
      if (item.folder) await this.ensureFolder(item.folder);

      const filePath = item.folder ? `${item.folder}/${item.title}.md` : `${item.title}.md`;
      let fileAbs = this.app.vault.getAbstractFileByPath(filePath);

      let file: TFile;
      if (fileAbs instanceof TFile) {
        file = fileAbs;
      } else {
        const content = `# ${item.title}\n\n${item.content}\n\n`;
        file = await this.app.vault.create(filePath, content);
      }
      createdFiles[item.title] = file;
    }

    // Step 2: Add bidirectional links
    for (const item of data) {
      const file = createdFiles[item.title];
      if (!file) continue; // safety for strict indexing

      let currentContent = await this.app.vault.read(file);

      for (const link of item.links ?? []) {
        const linkedFile = createdFiles[link];
        if (!linkedFile) continue;

        const linkMarkdown = `[[${linkedFile.basename}]]`;
        if (!currentContent.includes(linkMarkdown)) {
          currentContent += `\n${linkMarkdown}`;
        }

        let linkedContent = await this.app.vault.read(linkedFile);
        const backlinkMarkdown = `[[${file.basename}]]`;
        if (!linkedContent.includes(backlinkMarkdown)) {
          linkedContent += `\n${backlinkMarkdown}`;
          await this.app.vault.modify(linkedFile, linkedContent);
        }
      }

      await this.app.vault.modify(file, currentContent);
    }

    console.debug("Graph generated with bidirectional links!");
  }

  async ensureFolder(folderPath: string) {
    const parts = folderPath.split("/");
    let currentPath = "";
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      try {
        await this.app.vault.createFolder(currentPath);
      } catch {
        // folder exists
      }
    }
  }

  onunload() {
    console.debug("JSON File Graph Plugin unloaded");
  }
}
