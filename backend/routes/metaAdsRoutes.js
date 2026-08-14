import express from "express";
import {
  getMetaAdsProducts,
  getMetaAdsSummary,
} from "../controllers/metaAdsController.js";

const router = express.Router();

// Direct Feed Endpoints for Meta Scheduled Catalog Uploads
router.get("/catalog.xml", (req, res, next) => {
  req.query.format = "xml";
  return getMetaAdsProducts(req, res, next);
});

router.get("/catalog.csv", (req, res, next) => {
  req.query.format = "csv";
  return getMetaAdsProducts(req, res, next);
});

router.get("/catalog.json", (req, res, next) => {
  req.query.format = "json";
  return getMetaAdsProducts(req, res, next);
});

// Format-specific sub-routes
router.get("/products/xml", (req, res, next) => {
  req.query.format = "xml";
  return getMetaAdsProducts(req, res, next);
});

router.get("/products/csv", (req, res, next) => {
  req.query.format = "csv";
  return getMetaAdsProducts(req, res, next);
});

router.get("/products/json", (req, res, next) => {
  req.query.format = "json";
  return getMetaAdsProducts(req, res, next);
});

// Primary API Feed endpoint (supports ?format=xml|csv|json)
router.get("/products", getMetaAdsProducts);

// Feed Summary & Configuration
router.get("/summary", getMetaAdsSummary);
router.get("/info", getMetaAdsSummary);

export default router;
