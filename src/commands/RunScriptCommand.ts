import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export class RunScriptCommand implements Command {
    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        if (args.length === 0) {
            await sock.sendMessage(sender, { text: "Por favor especifica el nombre del script. Ej: `!run saludo.py`" });
            return;
        }

        const scriptName = args[0];
        const scriptArgs = args.slice(1);

        const scriptsDir = path.join(process.cwd(), 'scripts');
        const scriptPath = path.join(scriptsDir, scriptName);

        // Security check: ensure scriptPath stays within the scripts directory to prevent path traversal
        const resolvedPath = path.resolve(scriptPath);
        if (!resolvedPath.startsWith(path.resolve(scriptsDir))) {
            await sock.sendMessage(sender, { text: "Acceso denegado: Ruta del script no permitida." });
            return;
        }

        if (!fs.existsSync(scriptPath)) {
            await sock.sendMessage(sender, { text: `El script \`${scriptName}\` no existe en la carpeta 'scripts'.` });
            return;
        }

        // Notify user execution has started
        await sock.sendMessage(sender, { text: `⚙️ Ejecutando \`${scriptName}\`...` });

        // Build command line depending on extension
        const ext = path.extname(scriptPath).toLowerCase();
        let cmd = '';

        const escapedScriptPath = `"${scriptPath}"`;
        const escapedArgs = scriptArgs.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');

        switch (ext) {
            case '.py':
                cmd = `python ${escapedScriptPath} ${escapedArgs}`;
                break;
            case '.js':
            case '.mjs':
                cmd = `node ${escapedScriptPath} ${escapedArgs}`;
                break;
            case '.ps1':
                cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File ${escapedScriptPath} ${escapedArgs}`;
                break;
            case '.bat':
            case '.cmd':
                cmd = `${escapedScriptPath} ${escapedArgs}`;
                break;
            default:
                // Run directly/try standard shell execution
                cmd = `${escapedScriptPath} ${escapedArgs}`;
                break;
        }

        exec(cmd, (error, stdout, stderr) => {
            let response = '';
            if (error) {
                response += `❌ *Error de ejecución:*\n\`\`\`${error.message}\`\`\`\n`;
            }
            if (stderr) {
                response += `⚠️ *stderr:*\n\`\`\`${stderr}\`\`\`\n`;
            }
            if (stdout) {
                response += `📤 *Resultado:*\n\`\`\`${stdout}\`\`\`\n`;
            }

            if (!response) {
                response = `✅ Script \`${scriptName}\` ejecutado con éxito (sin salida de consola).`;
            }

            sock.sendMessage(sender, { text: response }).catch(err => {
                console.error("Error al enviar resultado de script:", err);
            });
        });
    }
}
