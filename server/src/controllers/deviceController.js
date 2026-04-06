import Device from '../models/Device.js';
import User from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { successResponse, errorResponse } from '../services/utils.js';

export async function registerDevice(req, res) {
  try {
    const { deviceName, deviceType, browser, os, ipAddress } = req.body;

    const deviceCount = await Device.countDocuments({
      userId: req.userId,
      isActive: true
    });

    if (deviceCount >= 2) {
      const existingDevices = await Device.find({
        userId: req.userId,
        isActive: true
      }).sort({ lastUsed: -1 });

      return res.status(403).json({
        success: false,
        message: 'Device limit reached. You can only use 2 devices.',
        existingDevices: existingDevices.map(d => ({
          id: d._id,
          name: d.deviceName,
          lastUsed: d.lastUsed
        }))
      });
    }

    const deviceId = uuidv4();

    let device = await Device.findOne({ userId: req.userId, deviceId });

    if (device) {
      device.lastUsed = new Date();
      device.isActive = true;
      await device.save();
    } else {
      device = new Device({
        userId: req.userId,
        deviceId,
        deviceName: deviceName || 'Unknown Device',
        deviceType: deviceType || 'desktop',
        browser: browser || 'Unknown',
        os: os || 'Unknown',
        ipAddress: ipAddress || '',
        isActive: true
      });
      await device.save();
    }

    successResponse(res, { deviceId, device }, 'Device registered');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function getMyDevices(req, res) {
  try {
    const devices = await Device.find({ userId: req.userId }).sort({ lastUsed: -1 });
    successResponse(res, devices);
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function updateDevice(req, res) {
  try {
    const { deviceName } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { deviceName },
      { new: true }
    );

    if (!device) return errorResponse(res, 'Device not found', 404);
    successResponse(res, device, 'Device updated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function deactivateDevice(req, res) {
  try {
    const device = await Device.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!device) return errorResponse(res, 'Device not found', 404);
    successResponse(res, null, 'Device deactivated');
  } catch (error) {
    errorResponse(res, error.message);
  }
}

export async function verifyDevice(req, res) {
  try {
    const { deviceId } = req.body;

    const device = await Device.findOne({
      userId: req.userId,
      deviceId,
      isActive: true
    });

    if (!device) {
      return res.status(403).json({
        success: false,
        message: 'Device not authorized. Please register this device.',
        needsRegistration: true
      });
    }

    device.lastUsed = new Date();
    await device.save();

    successResponse(res, { device }, 'Device verified');
  } catch (error) {
    errorResponse(res, error.message);
  }
}
