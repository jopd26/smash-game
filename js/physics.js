const Physics = {
  // Smash Bros knockback formula
  calcKnockback(damage, percent, bkb, kbg, weight) {
    const w = weight / 100;
    const p = (percent / 10 + percent * damage / 20) * (200 / (w + 100)) * 1.4 + 18;
    return (p * kbg + bkb);
  },

  resolveKnockback(hit, target) {
    const kb = Physics.calcKnockback(hit.dmg, target.damage, hit.bkb, hit.kbg, target.charData.stats.weight);
    const rad = (hit.ang * Math.PI) / 180;
    const facing = target.lastHitFacing || 1;
    let kbx = Math.cos(rad) * kb * facing;
    let kby = -Math.sin(rad) * kb;
    if (hit.meteor) { kbx = 0; kby = Math.abs(kby); }
    return { vx: kbx, vy: kby, hitstun: Math.floor(kb * 0.4 + 4) };
  },

  rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  },

  getHitbox(player, hitDef) {
    const flip = player.facing;
    const hb = hitDef.hb;
    return {
      x: player.x + (flip > 0 ? hb.x : -(hb.x + hb.w)),
      y: player.y + hb.y,
      w: hb.w, h: hb.h
    };
  },

  getHurtbox(player) {
    return { x: player.x - 15, y: player.y - 55, w: 30, h: 60 };
  },

  platformCollide(player, platform) {
    const py = player.y;
    const pvx = player.vx;
    const pvy = player.vy;
    const pw = 16, ph = 60;
    const px = player.x;

    if (platform.type === 'passthrough') {
      if (pvy < 0) return false;
      if (player.dropThrough) return false;
      const prevBottom = py - pvy;
      const platTop = platform.y;
      if (prevBottom <= platTop && py >= platTop - ph) {
        if (px + pw / 2 > platform.x && px - pw / 2 < platform.x + platform.w) {
          return true;
        }
      }
      return false;
    }

    // Solid platform
    const playerRect = { x: px - pw / 2, y: py - ph, w: pw, h: ph };
    const platRect = { x: platform.x, y: platform.y, w: platform.w, h: platform.h };
    if (!Physics.rectOverlap(playerRect, platRect)) return false;

    const overlapX = Math.min(playerRect.x + pw, platRect.x + platRect.w) - Math.max(playerRect.x, platRect.x);
    const overlapY = Math.min(playerRect.y + ph, platRect.y + platRect.h) - Math.max(playerRect.y, platRect.y);

    if (overlapX < overlapY) {
      return { axis: 'x', overlap: overlapX };
    } else {
      return { axis: 'y', overlap: overlapY };
    }
  }
};
