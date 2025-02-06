import { Customer, Gender } from "../models/customer.model";
import * as jwt from "jsonwebtoken";
import { JWTUtils } from "../utils/jwt.utils";
import type {
  RegisterCustomerDto,
  LoginCustomerDto,
  AuthResponse,
} from "../types/auth.types";
import { TokenBlacklist } from "../models/token-blacklist.model";
import bcrypt from "bcrypt";
import $loyverse from "../loyverse/loyverse.request";

export class AuthController {
  static async register(
    data: RegisterCustomerDto,
    token: string
  ): Promise<AuthResponse> {
    let customer;

    try {
      // Check if customer already exists in local DB
      const existingCustomer = await Customer.findOne({
        $or: [{ email: data.email }, { phone_number: data.email }],
      });
      if (existingCustomer) {
        throw new Error("Email already registered");
      }

      // Hash phone number as password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.phone_number, salt);

      // Create new customer in local DB with hashed phone as password
      customer = new Customer({
        ...data,
        password: hashedPassword, // Use hashed phone as password
        phone_number: data.phone_number, // Ensure it's correctly assigned
      });

      const newCustomer = await customer.save();

      // Prepare payload for third-party service
      const thirdPartyPayload = {
        // id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
        address: customer.address,
        city: customer.city,
        region: customer.region,
        postal_code: customer.postal_code,
        country_code: customer.country_code,
        customer_code: customer.customer_code,
        note: customer.note,
        total_points: customer.total_points || 0,
      };

      // Save customer in third-party service
      const loyverseResponse = await $loyverse.createLoyverseCustomer(
        thirdPartyPayload
      );

      await newCustomer.updateOne({
        $set: {
          partnerCustomerId: loyverseResponse.id,
        },
      });

      // Generate tokens
      const tokens = JWTUtils.generateTokens(customer);

      // Prepare response
      return {
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone_number: customer.phone_number,
          address: customer.address,
          city: customer.city,
          region: customer.region,
          postal_code: customer.postal_code,
          country_code: customer.country_code,
          customer_code: customer.customer_code,
          note: customer.note,
          total_points: customer.total_points,
        },
        tokens,
      };
    } catch (error) {
      // Rollback local DB changes if third-party registration fails
      if (customer) {
        await Customer.deleteOne({ _id: customer._id });
      }
      throw error;
    }
  }

  static async login(data: LoginCustomerDto): Promise<AuthResponse> {
    try {
      // Find customer by either email or phone_number
      const customer = await Customer.findOne({
        $or: [{ email: data.email }, { phone_number: data.email }],
      });

      if (!customer) {
        throw new Error("Invalid credentials");
      }

      console.log("Entered password:", data.password); // Display entered password (phone number)
      console.log("Stored hashed password:", customer.password); // Display stored hashed password

      // Compare entered password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(
        data.password,
        customer.password
      );

      console.log("Password match:", isPasswordValid); // Should now return true if correct

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Generate tokens
      const tokens = JWTUtils.generateTokens(customer);

      // Prepare response
      return {
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          phone_number: customer.phone_number,
        },
        tokens,
      };
    } catch (error) {
      throw error;
    }
  }

  static async logout(accessToken: string) {
    try {
      // Decode the token to get the payload
      const decoded = jwt.decode(accessToken) as any;
      if (!decoded) {
        throw new Error("Invalid token");
      }

      // Find customer's current valid tokens and blacklist them
      await TokenBlacklist.create([
        {
          token: accessToken,
          tokenType: "ACCESS",
          expiresAt: new Date(decoded.exp * 1000),
        },
        // We blacklist both access and refresh tokens
        {
          token: accessToken, // Using access token as identifier
          tokenType: "REFRESH",
          expiresAt: new Date(decoded.exp * 1000 + 7 * 24 * 60 * 60 * 1000), // Refresh token expiry (7 days after access token)
        },
      ]);

      return { message: "Logged out successfully" };
    } catch (error) {
      throw error;
    }
  }
}
