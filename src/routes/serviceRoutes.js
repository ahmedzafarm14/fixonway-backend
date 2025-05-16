import express from "express";
import User from "../models/User.js";
import Service from "../models/service.js";
import * as serviceController from "../controllers/serviceController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/provider/:id", serviceController.getProviderServices);

router.post("/add-service", authMiddleware, async (req, res) => {
  const { providerId, name, details, price } = req.body;
  try {
    const newService = new Service({
      providerId,
      name,
      description: details,
      price,
    });
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/delete-service/:id", async (req, res) => {
  try {
    console.log("this is id:", req.params.id);
    await Service.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Service deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.put("/update-service/:id", async (req, res) => {
  const { name, details, price } = req.body;
  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description: details, price },
      { new: true }
    );
    res.status(200).json(updatedService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/update-location/:id", async (req, res) => {
  const { id } = req.params.id;
  const { location } = req.body;
  console.log("this is location:", location);
  console.log("this is id:", id);
  try {
    await User.findByIdAndUpdate(id, {
      location,
    });

    res.json({ message: "Location updated", location });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/nearby", async (req, res) => {
  const [lng, lat] = req.body.location.coordinates;

  if (!lng || !lat) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required." });
  }

  try {
    const providers = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distanceInMeters",
          maxDistance: 15000,
          spherical: true,
          query: {
            role: "provider",
            isAvailable: true,
          },
        },
      },
      {
        $addFields: {
          distanceInKM: { $divide: ["$distanceInMeters", 1000] },
        },
      },
      {
        $project: {
          email: 0,
          password: 0,
          distanceInMeters: 0,
        },
      },
    ]);

    res.status(200).json(providers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
