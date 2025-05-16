import ServiceType from "../models/servicesTypes.js";

export const addServiceType = async (req, res) => {
  console.log("asdasd");
  try {
    console.log("req.body", req.body);
    const serviceType = new ServiceType({ name: req.body.name });
    await serviceType.save();
    res.status(201).json(serviceType);
  } catch (err) {
    res.status(500).json({ message: "Failed to add service type" });
  }
};
export const getServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find();
    res.status(200).json(serviceTypes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch service types" });
  }
};
