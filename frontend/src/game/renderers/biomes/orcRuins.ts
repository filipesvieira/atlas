import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Ruínas Orcs / Castelo de Greiscu (O icônico Castle Grayskull com a fachada de crânio gigante, pontes de fangs e tempestade carmim) */
export function getOrcRuinsBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_orcruins', w, h, (ctx) => {
    // Céu Tempestuoso Carmim e Púrpura
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#4c1d95');
    skyGrad.addColorStop(0.4, '#701a75');
    skyGrad.addColorStop(0.7, '#be185d');
    skyGrad.addColorStop(1, '#9f1239');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Nuvens Tempestuosas em Carretel Escuro
    ctx.fillStyle = 'rgba(30, 27, 75, 0.4)';
    ctx.beginPath();
    ctx.arc(100, 20, 50, 0, Math.PI * 2);
    ctx.arc(260, 15, 60, 0, Math.PI * 2);
    ctx.arc(420, 25, 45, 0, Math.PI * 2);
    ctx.fill();

    // Solo de Pedras Vulcânicas e Caminho de Lajotas
    const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    groundGrad.addColorStop(0, '#311042');
    groundGrad.addColorStop(0.5, '#1e1b4b');
    groundGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Caminho central de pedra roxa
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 40, h * 0.5);
    ctx.lineTo(w * 0.5 + 40, h * 0.5);
    ctx.lineTo(w * 0.5 + 90, h);
    ctx.lineTo(w * 0.5 - 90, h);
    ctx.fill();

    // Stalagmites/Picos de osso afiados nas bordas do caminho
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(40, h * 0.85);
    ctx.lineTo(55, h * 0.68);
    ctx.lineTo(68, h * 0.85);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(430, h * 0.88);
    ctx.lineTo(448, h * 0.70);
    ctx.lineTo(462, h * 0.88);
    ctx.fill();

    // 🏰 CASTELO DE GREISCU (CASTLE GRAYSKULL)
    const castleX = 170;
    const castleY = h * 0.12;

    // Torres Laterais de Pedra Verde Musgo
    ctx.fillStyle = '#15803d';
    ctx.fillRect(castleX, castleY + 20, 42, 110);
    ctx.fillRect(castleX + 118, castleY + 20, 42, 110);

    // Ameias/Muros no topo das torres
    ctx.fillStyle = '#166534';
    ctx.fillRect(castleX - 4, castleY + 10, 50, 14);
    ctx.fillRect(castleX + 114, castleY + 10, 50, 14);
    // Dentes das ameias
    ctx.fillStyle = '#14532d';
    ctx.fillRect(castleX - 2, castleY + 6, 8, 8);
    ctx.fillRect(castleX + 16, castleY + 6, 8, 8);
    ctx.fillRect(castleX + 34, castleY + 6, 8, 8);
    ctx.fillRect(castleX + 116, castleY + 6, 8, 8);
    ctx.fillRect(castleX + 134, castleY + 6, 8, 8);
    ctx.fillRect(castleX + 152, castleY + 6, 8, 8);

    // Bloco Central do Castelo e Domo Superior
    ctx.fillStyle = '#15803d';
    ctx.fillRect(castleX + 35, castleY + 30, 90, 100);
    // Domo do elmo central
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(castleX + 80, castleY + 30, 26, Math.PI, 0);
    ctx.fill();

    // 💀 A FACHADA DE CRÂNIO GIGANTE
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(castleX + 80, castleY + 65, 36, 0, Math.PI * 2);
    ctx.fill();

    // Cavidades Oculares Ocultas
    ctx.fillStyle = '#022c22';
    ctx.beginPath();
    ctx.arc(castleX + 63, castleY + 60, 11, 0, Math.PI * 2);
    ctx.arc(castleX + 97, castleY + 60, 11, 0, Math.PI * 2);
    ctx.fill();

    // Cavidade Nasal em V
    ctx.beginPath();
    ctx.moveTo(castleX + 80, castleY + 70);
    ctx.lineTo(castleX + 74, castleY + 80);
    ctx.lineTo(castleX + 86, castleY + 80);
    ctx.fill();

    // Mandíbula e Grandes Presas de Marfim (Fangs)
    ctx.fillStyle = '#fef3c7';
    // Presa esquerda gigantesca
    ctx.beginPath();
    ctx.moveTo(castleX + 50, castleY + 80);
    ctx.quadraticCurveTo(castleX + 46, castleY + 115, castleX + 54, castleY + 125);
    ctx.quadraticCurveTo(castleX + 60, castleY + 110, castleX + 60, castleY + 80);
    ctx.fill();

    // Presa direita gigantesca
    ctx.beginPath();
    ctx.moveTo(castleX + 110, castleY + 80);
    ctx.quadraticCurveTo(castleX + 114, castleY + 115, castleX + 106, castleY + 125);
    ctx.quadraticCurveTo(castleX + 100, castleY + 110, castleX + 100, castleY + 80);
    ctx.fill();

    // Dentes superiores entre as presas
    for (let tx = castleX + 62; tx < castleX + 98; tx += 7) {
      ctx.fillRect(tx, castleY + 82, 5, 8);
    }

    // Porta do Portão Rústico sob a Boca do Crânio
    ctx.fillStyle = '#451a03';
    ctx.fillRect(castleX + 60, castleY + 88, 40, 42);
    ctx.fillStyle = '#290d02';
    ctx.fillRect(castleX + 79, castleY + 88, 2, 42);
    // Escudo com emblema rubro na porta
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(castleX + 80, castleY + 98, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(castleX + 78, castleY + 96, 4, 4);
  });
}
