import mongoose, { Schema } from "mongoose";

// Interface for SystemConfig document
export interface ISystemConfig {
  _id: string;
  umamiSync?: {
    lastSessionSync?: Date;
    lastAnalyticsSync?: Date;
    websiteSyncStatus?: {
      [websiteId: string]: {
        lastSync?: Date;
        lastDaySynced?: string;
        sessionsProcessed?: number;
        errorCount?: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// SystemConfig schema definition
const SystemConfigSchema = new Schema(
  {
    _id: { type: String, default: 'global' },
    umamiSync: {
      lastSessionSync: { type: Date },
      lastAnalyticsSync: { type: Date },
      websiteSyncStatus: {
        type: Schema.Types.Mixed,
        default: {}
      }
    }
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false
  }
);

// Ensure only one document can exist
SystemConfigSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingCount = await mongoose.model('SystemConfig').countDocuments();
    if (existingCount > 0) {
      throw new Error('Only one system configuration document is allowed');
    }
  }
  next();
});

// Export the SystemConfig model
export default mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);