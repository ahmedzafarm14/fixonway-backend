import express from "express";
import {
  addServiceType,
  getServiceTypes,
} from "../controllers/servicesTypesController.js";
const router = express.Router();

router.post("/add-service-type", addServiceType);
router.get("/get-service-types", getServiceTypes);
export default router;
