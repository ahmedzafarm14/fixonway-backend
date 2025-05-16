import Service from "../models/service.js";

export const getProviderServices = async (req, res) => {
  try {
    console.log(req.params.id);
    const services = await Service.find({ providerId: req.params.id });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
