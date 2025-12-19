export function updateVfdWithContext(v, ctx) {
  const prev = v.alarmCode;
  let code = v.alarmCode;

  if (Math.random() < 0.03) {
    const all = ["U0-54","U0-55","U0-56","U0-60","U0-61"];
    code = Math.random() < 0.5 ? all[Math.floor(Math.random()*all.length)] : null;
  }

  if (!prev && code && ctx?.faultsCollector) {
    ctx.faultsCollector.push({
      id: Date.now()+"-"+Math.random(),
      time: new Date().toISOString(),
      controllerCode: ctx.controller.code,
      channelId: ctx.channel.id,
      deviceId: ctx.device.id,
      alarmCode: code,
    });
  }

  return { ...v, alarmCode: code };
}
