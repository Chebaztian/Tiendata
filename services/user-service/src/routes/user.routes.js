const { Router } = require('express');

function createUserRoutes(controller) {
  const router = Router();

  router.post('/', controller.createUser);
  router.get('/', controller.listUsers);
  router.get('/:id', controller.getUserById);
  router.put('/:id', controller.updateUser);
  router.delete('/:id', controller.deleteUser);
  router.post('/:id/desbloquear', controller.unlockUser);

  return router;
}

module.exports = { createUserRoutes };
