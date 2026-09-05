import express from "express";
import { requirePermission } from "../middleware/organization-access.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validators/products.js";
import {
  archiveProduct,
  createProduct,
  getProduct,
  listProducts,
  unarchiveProduct,
  updateProduct,
} from "../controllers/products.js";

const router = express.Router();
const canCreateProducts = requirePermission("product", "create");
const canUpdateProducts = requirePermission("product", "update");
const canArchiveProducts = requirePermission("product", "archive");

router.post(
  "/",
  canCreateProducts,
  validateBody(createProductSchema),
  createProduct,
);
router.get("/", canCreateProducts, listProducts);
router.get("/:id", canCreateProducts, getProduct);
router.patch(
  "/:id",
  canUpdateProducts,
  validateBody(updateProductSchema),
  updateProduct,
);
router.patch("/:id/archive", canArchiveProducts, archiveProduct);
router.patch("/:id/unarchive", canArchiveProducts, unarchiveProduct);

export default router;
