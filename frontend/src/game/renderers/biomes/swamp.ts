import { getOffscreenCanvas } from './canvasCache';

/** Cenário: Vila do Shereque (Pântano temático com a famosa Casa Tronco do Shereque, raízes e bruma) */
export function getSherequeBackground(w = 500, h = 260): HTMLCanvasElement {
  return getOffscreenCanvas('bg_shereque', w, h, (ctx) => {
    // Céu de Pântano com Raios de Sol Suaves
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    skyGrad.addColorStop(0, '#064e3b');
    skyGrad.addColorStop(0.7, '#14532d');
    skyGrad.addColorStop(1, '#166534');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.5);

    // Raios de Sol Crepusculares através das copas
    ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
    ctx.beginPath();
    ctx.moveTo(80, 0);
    ctx.lineTo(160, h * 0.5);
    ctx.lineTo(210, h * 0.5);
    ctx.lineTo(110, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(220, 0);
    ctx.lineTo(320, h * 0.5);
    ctx.lineTo(370, h * 0.5);
    ctx.lineTo(250, 0);
    ctx.fill();

    // Silhueta de Árvores de Pântano ao fundo com Musgo Pendurado
    ctx.fillStyle = '#022c22';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(40, h * 0.2);
    ctx.lineTo(90, h * 0.5);
    ctx.lineTo(150, h * 0.25);
    ctx.lineTo(220, h * 0.5);
    ctx.fill();

    // Musgo pendente nas árvores
    ctx.fillStyle = '#15803d';
    ctx.fillRect(45, h * 0.25, 4, 20);
    ctx.fillRect(52, h * 0.28, 3, 15);
    ctx.fillRect(155, h * 0.28, 4, 18);

    // Solo de Lama do Pântano com Grama Rústica
    const groundGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
    groundGrad.addColorStop(0, '#14532d');
    groundGrad.addColorStop(0.4, '#36220f');
    groundGrad.addColorStop(1, '#1c1007');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Trilha central de terra úmida
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.4, h * 0.58, w, h * 0.68);
    ctx.lineTo(w, h * 0.90);
    ctx.quadraticCurveTo(w * 0.4, h * 0.78, 0, h * 0.88);
    ctx.fill();

    // 🏠 A FAMOSA CASA TRONCO DO SHEREQUE (X: 290 a 460, Y: h*0.35 a h*0.82)
    const houseX = 310;
    const houseY = h * 0.35;

    // Tronco Principal Oco (Madeira escura e cortada no topo)
    ctx.fillStyle = '#361202';
    ctx.beginPath();
    ctx.moveTo(houseX + 20, houseY + 110);
    ctx.lineTo(houseX + 35, houseY + 30);
    ctx.lineTo(houseX + 90, houseY + 30);
    ctx.lineTo(houseX + 110, houseY + 110);
    ctx.fill();

    // Topo do Tronco Quebrado
    ctx.fillStyle = '#5c2206';
    ctx.beginPath();
    ctx.ellipse(houseX + 62, houseY + 30, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#290d02';
    ctx.beginPath();
    ctx.ellipse(houseX + 62, houseY + 30, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Telhado de Musgo & Ervas Sobrepostas (Verde exuberante caindo)
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.moveTo(houseX - 10, houseY + 65);
    ctx.quadraticCurveTo(houseX + 60, houseY + 10, houseX + 135, houseY + 65);
    ctx.lineTo(houseX + 120, houseY + 80);
    ctx.quadraticCurveTo(houseX + 60, houseY + 35, houseX + 5, houseY + 80);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(houseX + 30, houseY + 45, 18, 0, Math.PI * 2);
    ctx.arc(houseX + 60, houseY + 35, 22, 0, Math.PI * 2);
    ctx.arc(houseX + 95, houseY + 48, 18, 0, Math.PI * 2);
    ctx.fill();

    // Raízes Gigantes Enraizadas na Lama
    ctx.fillStyle = '#290d02';
    ctx.beginPath();
    ctx.moveTo(houseX + 25, houseY + 80);
    ctx.quadraticCurveTo(houseX - 15, houseY + 110, houseX - 25, houseY + 125);
    ctx.lineTo(houseX + 5, houseY + 125);
    ctx.quadraticCurveTo(houseX + 25, houseY + 110, houseX + 40, houseY + 95);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(houseX + 95, houseY + 85);
    ctx.quadraticCurveTo(houseX + 135, houseY + 110, houseX + 150, houseY + 125);
    ctx.lineTo(houseX + 130, houseY + 125);
    ctx.quadraticCurveTo(houseX + 110, houseY + 110, houseX + 85, houseY + 98);
    ctx.fill();

    // Porta Rústica de Madeira no Tronco
    ctx.fillStyle = '#5c2a0c';
    ctx.fillRect(houseX + 48, houseY + 75, 26, 38);
    ctx.fillStyle = '#1c0a02';
    ctx.fillRect(houseX + 46, houseY + 73, 30, 3);
    ctx.fillRect(houseX + 46, houseY + 73, 3, 40);
    ctx.fillRect(houseX + 73, houseY + 73, 3, 40);
    // Trinco da porta
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(houseX + 68, houseY + 93, 3, 4);

    // Pedras de Caminho
    ctx.fillStyle = '#64748b';
    ctx.fillRect(houseX + 30, houseY + 115, 10, 5);
    ctx.fillRect(houseX + 12, houseY + 122, 12, 6);
    ctx.fillRect(houseX - 10, houseY + 128, 14, 6);

    // Placa de Aviso "CUIDADO COM O OGRO" à esquerda
    ctx.fillStyle = '#78350f';
    ctx.fillRect(40, h * 0.65, 4, 25);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(28, h * 0.62, 28, 14);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(32, h * 0.66, 20, 4);

    // Cogumelos Místicos Grandes na borda esquerda
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(100, h * 0.72, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(97, h * 0.72, 6, 10);
  });
}