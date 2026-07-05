import { WAMessage } from '@whiskeysockets/baileys';
import makeWASocket from '@whiskeysockets/baileys';
import { Command } from './Command.js';
import { jules as julesClient } from '@google/jules-sdk';
import { DatabaseService } from '../database.js';
import { sendBotMessage } from '../utils/botMessage.js';

export class WorkCommand implements Command {
    public async execute(message: WAMessage, sock: ReturnType<typeof makeWASocket>, args: string[]): Promise<void> {
        const sender = message.key.remoteJid;
        if (!sender) return;

        const targetDest = sender;

        const apiKey = process.env.JULES_API_KEY;
        const client = apiKey ? julesClient.with({ apiKey }) : julesClient;

        if (!args || args.length === 0) {
            await sock.sendMessage(targetDest, { text: "⚠️ Uso: `!jarvis <prompt>` para crear una sesión, `!jarvis list` para listar sesiones recientes, `!jarvis ask <sessionId> <pregunta>` para preguntar a una sesión existente." });
            return;
        }

        const sub = args[0].toLowerCase();

        const db = DatabaseService.getInstance();

        const generateShortId = async (): Promise<string> => {
            let attempt = 0;
            while (attempt < 1000) {
                const num = Math.floor(Math.random() * 10000);
                const short = num.toString().padStart(4, '0');
                const exists = await db.shortIdExists(short);
                if (!exists) return short;
                attempt++;
            }
            throw new Error('No unique short ID available');
        };

        try {
            // Approve a pending plan: !jarvis approve [<shortId|sessionId>]
            if (sub === 'approve') {
                let ident: string | undefined = args.length >= 2 ? args[1] : undefined;
                let sessionIdToApprove: string | undefined;

                if (ident) {
                    sessionIdToApprove = ident;
                    if (/^\d{4}$/.test(ident)) {
                        const rec = await db.getJulesSessionByShortId(ident);
                        if (!rec) {
                            await sendBotMessage(sock, targetDest, `❌ Alias corto ${ident} no encontrado.`);
                            return;
                        }
                        sessionIdToApprove = rec.sessionId;
                    }
                } else {
                    const active = await db.getActiveSession(sender);
                    if (!active) {
                        await sendBotMessage(sock, targetDest, 'ℹ️ No tienes una sesión activa. Usa `!jarvis-session-start <alias|sessionId>` o proporciona un alias en el comando.');
                        return;
                    }
                    sessionIdToApprove = active;
                }

                try {
                    const sessionToApprove = (client as any).session?.(sessionIdToApprove) || (client as any).session(sessionIdToApprove);
                    if (!sessionToApprove) {
                        await sendBotMessage(sock, targetDest, `❌ Sesión ${sessionIdToApprove} no encontrada.`);
                        return;
                    }

                    await sessionToApprove.approve?.();
                    await sendBotMessage(sock, targetDest, `✅ Plan aprobado para sesión ${sessionIdToApprove}.`);
                } catch (e) {
                    console.error('Error aprobando plan:', e);
                    await sendBotMessage(sock, targetDest, `❌ Error al aprobar el plan: ${String(e)}`);
                }
                return;
            }

            if (sub === 'list') {
                // Try to list recent sessions; API may differ, handle gracefully
                try {
                    // @ts-ignore - client.select may or may not exist depending on SDK
                    const sessions = await (client as any).select?.({ from: 'sessions', limit: 10 }) || null;
                    if (!sessions) {
                        await sock.sendMessage(targetDest, { text: 'ℹ️ No se pudo obtener la lista de sesiones desde Jules (API no disponible en esta versión).' });
                        return;
                    }

                    const items = sessions.rows || sessions || [];
                    if (items.length === 0) {
                        await sock.sendMessage(targetDest, { text: '📭 No hay sesiones recientes.' });
                        return;
                    }

                    let text = '📋 Sesiones recientes:\n\n';
                    for (const s of items) {
                        const id = s.id || s.sessionId || s['id'];
                        const state = s.state || s.status || '';
                        text += `• ${id} — ${state}\n`;
                    }
                    await sock.sendMessage(targetDest, { text });
                    return;
                } catch (e) {
                    console.error('Error listando sesiones Jules:', e);
                    await sock.sendMessage(targetDest, { text: '❌ Error al listar sesiones.' });
                    return;
                }
            }

            if (sub === 'ask' && args.length >= 3) {
                const sessionId = args[1];
                const question = args.slice(2).join(' ');
                try {
                    const session = (client as any).session?.(sessionId) || (client as any).session(sessionId);
                    if (!session) {
                        await sock.sendMessage(targetDest, { text: `❌ Sesión ${sessionId} no encontrada.` });
                        return;
                    }

                    const reply = await session.ask(question);
                    const msg = reply?.message || reply?.text || JSON.stringify(reply);
                    await sock.sendMessage(targetDest, { text: `💬 Respuesta de la sesión ${sessionId}:\n\n${msg}` });
                } catch (e) {
                    console.error('Error preguntando a sesión Jules:', e);
                    await sock.sendMessage(targetDest, { text: '❌ Error al comunicarse con la sesión.' });
                }
                return;
            }

            // Default: create a new session with the prompt formed by args
            const prompt = args.join(' ');
            await sock.sendMessage(targetDest, { text: `⏳ Creando sesión Jules con prompt...` });

            const session = await (client as any).session({
                prompt,
                source: { github: 'robincajas12/jarvis', baseBranch: 'setup-personal-assistant-memory-17556449545708746304' },
            });

            const sid = session?.id || session?.sessionId || session;
            // Generate a short 4-digit id and persist mapping
            try {
                const shortId = await generateShortId();
                await db.addJulesSession(sender, sid, shortId);
                await sendBotMessage(sock, targetDest, `✅ Sesión creada: ${sid} Alias corto: ${shortId} — Para preguntar rápidamente usa:`);
                await sendBotMessage(sock, targetDest, `!jarvis ask ${shortId} <tu pregunta aquí>`);
                // Start a background listener for session activities (plan generation, awaiting approval, progress)
                (async () => {
                    try {
                        const stream = (session as any).stream?.();
                        if (!stream) return;
                        for await (const activity of stream) {
                            try {
                                const t = activity?.type;
                                if (t === 'planGenerated' || t === 'awaitingPlanApproval') {
                                    const plan = activity.plan;
                                    const steps = plan?.steps?.map((s: any) => `- ${s.title}`).join('\n') || JSON.stringify(plan);
                                    await sendBotMessage(sock, targetDest, `🧭 Plan generado para sesión ${sid}:\n${steps}\n\nAprobar con: !jarvis approve ${shortId}`);
                                } else if (t === 'agentMessaged') {
                                    const msg = activity.message || activity.summary || JSON.stringify(activity);
                                    await sendBotMessage(sock, targetDest, `🤖 Mensaje del agente:\n${msg}`);
                                }
                            } catch (inner) {
                                console.error('Error handling activity:', inner);
                            }
                        }
                    } catch (streamErr) {
                        console.error('Error streaming session activities:', streamErr);
                    }
                })();
            } catch (errShort) {
                console.error('Error generando shortId:', errShort);
                await sendBotMessage(sock, targetDest, `✅ Sesión creada: ${sid} Para preguntar rápidamente usa:`);
                await sendBotMessage(sock, targetDest, `!jarvis ask ${sid} <tu pregunta aquí>`);
            }
            return;
        } catch (err: any) {
            console.error('WorkCommand error:', err);
            await sock.sendMessage(targetDest, { text: `❌ Error creando o gestionando sesión: ${err?.message || err}` });
        }
    }
}
