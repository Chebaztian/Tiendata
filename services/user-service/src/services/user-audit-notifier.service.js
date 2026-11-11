function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const { contrasena, ...safeUser } = user;
  return safeUser;
}

class UserAuditNotifier {
  constructor({ auditWebhookUrl, fetchImpl = fetch } = {}) {
    this.auditWebhookUrl = auditWebhookUrl;
    this.fetchImpl = fetchImpl;
  }

  async post(payload) {
    if (!this.auditWebhookUrl) {
      return;
    }

    await this.fetchImpl(this.auditWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  buildActor(actorContext = {}) {
    if (!actorContext.userId && !actorContext.name && !actorContext.role) {
      return undefined;
    }

    return {
      id_usuario: actorContext.userId || undefined,
      nombre: actorContext.name || undefined,
      rol: actorContext.role || undefined,
    };
  }

  async notifyUserCreated({ actorContext, currentUser }) {
    await this.post({
      action: 'crear_usuario',
      module: 'usuarios',
      entity: 'usuario',
      entityId: currentUser.id_usuario,
      user: this.buildActor(actorContext),
      detail: {
        mensaje: 'Usuario registrado',
        correo: currentUser.correo,
      },
      newData: sanitizeUser(currentUser),
    });
  }

  async notifyUserUpdated({ actorContext, previousUser, currentUser }) {
    await this.post({
      action: 'modificar_usuario',
      module: 'usuarios',
      entity: 'usuario',
      entityId: currentUser.id_usuario,
      user: this.buildActor(actorContext),
      detail: {
        mensaje: 'Usuario actualizado',
        correo: currentUser.correo,
      },
      previousData: sanitizeUser(previousUser),
      newData: sanitizeUser(currentUser),
    });
  }

  async notifyUserDisabled({ actorContext, previousUser, currentUser }) {
    await this.post({
      action: 'deshabilitar_usuario',
      module: 'usuarios',
      entity: 'usuario',
      entityId: currentUser.id_usuario,
      user: this.buildActor(actorContext),
      detail: {
        mensaje: 'Usuario deshabilitado',
        correo: currentUser.correo,
      },
      previousData: sanitizeUser(previousUser),
      newData: sanitizeUser(currentUser),
    });
  }

  async notifyUserUnlocked({ actorContext, previousUser, currentUser }) {
    await this.post({
      action: 'desbloquear_usuario',
      module: 'usuarios',
      entity: 'usuario',
      entityId: currentUser.id_usuario,
      user: this.buildActor(actorContext),
      detail: {
        mensaje: 'Cuenta desbloqueada por un administrador',
        correo: currentUser.correo,
      },
      previousData: sanitizeUser(previousUser),
      newData: sanitizeUser(currentUser),
    });
  }
}

module.exports = { UserAuditNotifier };
