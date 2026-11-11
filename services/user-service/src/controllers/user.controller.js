const {
  validateCreateUserPayload,
  validateUpdateUserPayload,
  parseListQuery,
  parseUserId,
  extractActorContext,
} = require('../models/user.model');

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  createUser = async (req, res, next) => {
    try {
      const payload = validateCreateUserPayload(req.body);
      const actorContext = extractActorContext(req.headers);
      const user = await this.userService.createUser(payload, actorContext);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req, res, next) => {
    try {
      const idUsuario = parseUserId(req.params.id);
      const user = await this.userService.getUserById(idUsuario);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };

  listUsers = async (req, res, next) => {
    try {
      const query = parseListQuery(req.query);
      const result = await this.userService.listUsers(query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req, res, next) => {
    try {
      const idUsuario = parseUserId(req.params.id);
      const patch = validateUpdateUserPayload(req.body);
      const actorContext = extractActorContext(req.headers);

      const updated = await this.userService.updateUser(idUsuario, patch, actorContext);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  };

  unlockUser = async (req, res, next) => {
    try {
      const idUsuario = parseUserId(req.params.id);
      const actorContext = extractActorContext(req.headers);

      const unlocked = await this.userService.unlockUser(idUsuario, actorContext);
      res.status(200).json({ success: true, data: unlocked });
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req, res, next) => {
    try {
      const idUsuario = parseUserId(req.params.id);
      const actorContext = extractActorContext(req.headers);

      const deleted = await this.userService.deleteUser(idUsuario, actorContext);
      res.status(200).json({ success: true, data: deleted });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { UserController };
