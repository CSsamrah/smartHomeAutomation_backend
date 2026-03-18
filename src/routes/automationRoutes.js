/**
 * automationRoutes.js
 */

const router     = require('express').Router();
const controller = require('../controllers/automationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  validateCreateAutomation,
  validateUpdateAutomation,
  validateToggleAutomation,
} = require('../validators/automationValidator');
 
router.get(
  '/',
  protect,
  controller.handle(controller.listRules.bind(controller))
);
 
router.post(
  '/',
  protect,
  validateCreateAutomation,
  controller.handle(controller.createRule.bind(controller))
);
 
router.get(
  '/:id',
  protect,
  controller.handle(controller.getRule.bind(controller))
);
 
router.patch(
  '/:id',
  protect,
  validateUpdateAutomation,
  controller.handle(controller.updateRule.bind(controller))
);
 
router.delete(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  controller.handle(controller.deleteRule.bind(controller))
);
 
router.patch(
  '/:id/toggle',
  protect,
  validateToggleAutomation,
  controller.handle(controller.toggleRule.bind(controller))
);
 
router.post(
  '/:id/run',
  protect,
  controller.handle(controller.runRule.bind(controller))
);
 
module.exports = router;