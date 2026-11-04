class AuthAuditNotifier {
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

  async notifyLoginSuccess({ user, identifier, sessionId }) {
    await this.post({
      action: 'login_exitoso',
      module: 'auth',
      entity: 'sesion',
      entityId: user?.id_usuario,
      user: user
        ? {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            rol: user.rol,
          }
        : undefined,
      detail: {
        identificador: identifier,
        resultado: 'exitoso',
      },
      newData: {
        autenticado: true,
      },
      sessionId,
    });
  }

  async notifyLogout({ user, sessionId }) {
    await this.post({
      action: 'logout',
      module: 'auth',
      entity: 'sesion',
      entityId: user?.id_usuario,
      user: user
        ? {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            rol: user.rol,
          }
        : undefined,
      detail: {
        resultado: 'exitoso',
      },
      newData: {
        autenticado: false,
      },
      sessionId,
    });
  }

  async notifyLoginFailure({ user, identifier, reason }) {
    await this.post({
      action: 'login_fallido',
      module: 'auth',
      entity: 'sesion',
      entityId: user?.id_usuario,
      user: user
        ? {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            rol: user.rol,
          }
        : undefined,
      detail: {
        identificador: identifier,
        resultado: 'fallido',
        motivo: reason,
      },
      newData: {
        autenticado: false,
      },
    });
  }
}

module.exports = { AuthAuditNotifier };
