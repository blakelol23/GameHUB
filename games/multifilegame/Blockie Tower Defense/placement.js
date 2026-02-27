function drawPlacementRings(x, y) {
    // Draw outer glow
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.stroke();
  
    // Draw main ring
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  
function init() {
    cliffTiles = [
        { x: canvas.width * 0.15, y: canvas.height * 0.1, width: 40, height: 40 },
        { x: canvas.width * 0.45, y: canvas.height * 0.4, width: 40, height: 40 },
        { x: canvas.width * 0.75, y: canvas.height * 0.1, width: 40, height: 40 },
        { x: canvas.width * 0.25, y: canvas.height * 0.7, width: 40, height: 40 },
        { x: canvas.width * 0.85, y: canvas.height * 0.6, width: 40, height: 40 }
    ];
    cliffTiles = cliffTiles.concat([
        { x: canvas.width * 0.3, y: canvas.height * 0.2, width: 40, height: 40 },
        { x: canvas.width * 0.5, y: canvas.height * 0.4, width: 40, height: 40 },
          { x: canvas.width * 0.7, y: canvas.height * 0.6, width: 40, height: 40 },
          { x: canvas.width * 0.9, y: canvas.height * 0.8, width: 40, height: 40 },
      ]);
}

function drawTowerPlacementUI() {
    const towerTypes = ["basic", "machine", "sniper", "hunter", "minigunner", "support"];
    const buttonWidth = UI_TOWER_BTN_WIDTH;
    const buttonHeight = UI_TOWER_BTN_HEIGHT;
    const spacing = UI_TOWER_SPACING;
    const totalWidth = (buttonWidth + spacing) * towerTypes.length - spacing;
    const startX = (canvas.width - totalWidth) / 2;
    const y = canvas.height - UI_TOWER_BAR_Y_OFFSET;
  
    // Toolbar background
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,15,0.55)';
    ctx.beginPath();
    ctx.roundRect(startX - 18, y - 16, totalWidth + 36, buttonHeight + 32, 14);
    ctx.fill();
    ctx.restore();
  
    towerTypes.forEach((type, index) => {
        const x = startX + (buttonWidth + spacing) * index;
        const isSelected = placingTower && selectedTowerType === type;
  
        // Button background with gradient and highlight
        const grad = ctx.createLinearGradient(x, y, x, y + buttonHeight);
        grad.addColorStop(0, isSelected ? 'rgba(60,180,75,0.9)' : 'rgba(40,40,50,0.85)');
        grad.addColorStop(1, isSelected ? 'rgba(30,120,50,0.9)' : 'rgba(25,25,30,0.85)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, buttonWidth, buttonHeight, 10);
        ctx.fill();
  
        // Icon block
        ctx.fillStyle = type === "basic" ? "#4CAF50" : 
                       type === "machine" ? "#2196F3" : 
                       type === "sniper" ? "#607D8B" :
                       type === "hunter" ? "#ff9800" :
                       type === "minigunner" ? "#E91E63" :
                       type === "support" ? "#FFD700" : "#888";
        ctx.beginPath();
        ctx.roundRect(x + 14, y + 12, 48, 48, 6);
        ctx.fill();
  
        // Name and cost
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(type, x + buttonWidth/2 + 20, y + 30);
        ctx.fillStyle = "#B0C4DE";
        ctx.font = "bold 12px Arial";
        ctx.fillText(`$${towerStats[type].cost}`, x + buttonWidth/2 + 20, y + 50);
  
        // Affordability overlay
        if (cashSystem.getCash() < towerStats[type].cost) {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.beginPath();
          ctx.roundRect(x, y, buttonWidth, buttonHeight, 10);
          ctx.fill();
          ctx.fillStyle = "#FF5252";
          ctx.font = "bold 12px Arial";
          ctx.fillText("Insufficient", x + buttonWidth/2, y + buttonHeight - 10);
          ctx.restore();
        }
  
        // Hover tooltip
        if (mouseX > x && mouseX < x + buttonWidth && mouseY > y && mouseY < y + buttonHeight) {
            const statsW = 150;
            const statsH = 72;
            const sx = x + buttonWidth/2 - statsW/2;
            const sy = y - statsH - 10;
            ctx.save();
            ctx.fillStyle = 'rgba(20,20,25,0.95)';
            ctx.beginPath();
            ctx.roundRect(sx, sy, statsW, statsH, 8);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Range: ${Math.round(towerStats[type].range)}`, sx + statsW/2, sy + 22);
            ctx.fillText(`Damage: ${Math.round(towerStats[type].damage)}`, sx + statsW/2, sy + 40);
            ctx.fillText(`Cost: $${towerStats[type].cost}`, sx + statsW/2, sy + 58);
            ctx.restore();
        }
    });
  }
  
  function drawPlacementRings(x, y) {
    // Draw outer glow
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.stroke();
  
    // Draw main ring
    ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.stroke();
  }