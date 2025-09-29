import mongoose, { Schema } from "mongoose";

// Interface for User Schema - Minimal version for Umami sync
export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  session_id?: string; // Optional field for Umami session ID
  umamiAnalytics?: {
    id: string;
    websiteId: string;
    browser: string;
    os: string;
    device: string;
    screen: string;
    language: string;
    country?: string;
    region?: string;
    city?: string;
    firstAt: Date;
    lastAt: Date;
    visits: number;
    views: string;
    createdAt: Date;
  }; // Optional field for Umami analytics data
  organization: {
    _id: mongoose.Types.ObjectId; // Refers to 'organizations' collection
    name: string;
  };
  isDeleted: boolean;
  updatedAt: Date;
}

// User Schema Definition - Minimal version
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    session_id: {
      type: String
    },
    umamiAnalytics: {
      id: { type: String },
      websiteId: { type: String },
      browser: { type: String },
      os: { type: String },
      device: { type: String },
      screen: { type: String },
      language: { type: String },
      country: { type: String },
      region: { type: String },
      city: { type: String },
      firstAt: { type: Date },
      lastAt: { type: Date },
      visits: { type: Number },
      views: { type: String },
      createdAt: { type: Date },
    },
    organization: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "organization",
      },
      name: { type: String },
    },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
    versionKey: false
  }
);

// Create simple index on 'email'
UserSchema.index({ email: 1 });

// Create index on session_id for Umami integration performance
UserSchema.index({ session_id: 1 });

// Export the Mongoose model
export default mongoose.model<IUser>("user", UserSchema);