import { Admin } from '../models/admin.model';
import type { CreateAdminDto, LoginAdminDto, AdminRole, ToggleStatusDto, UpdateAdminDto } from '../types/admin.types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWTUtils } from '../utils/jwt.utils';

export class AdminController {
    static async createAdmin(data: CreateAdminDto) {
        try {
            const existingAdmin = await Admin.findOne({ email: data.email });
            
            if (existingAdmin) {
                throw new Error('Admin with this email already exists');
            }

            const adminData = {
                ...data,
                password: '12345678' // predefined password
            };

            const admin = new Admin(adminData);
            await admin.save();

            // Remove password from response
            const adminObject = admin.toObject();
            const { password, ...adminWithoutPassword } = adminObject;
            
            return adminObject;
        } catch (error) {
            throw error;
        }
    }

    static async getAllAdmins() {
        try {
            return await Admin.find()
                .select('-password') // Exclude password
                .sort({ createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    static async getAdminById(id: string) {
        try {
            const admin = await Admin.findById(id).select('-password');
            if (!admin) {
                throw new Error('Admin not found');
            }
            return admin;
        } catch (error) {
            throw error;
        }
    }

    static async loginAdmin(loginData: LoginAdminDto) {
        try {
            const admin = await Admin.findOne({ email: loginData.email });
            if (!admin) {
                throw new Error('Invalid credentials');
            }

            const isPasswordValid = await bcrypt.compare(loginData.password, admin.password);
            if (!isPasswordValid) {
                throw new Error('Invalid credentials');
            }

            // Use JWTUtils to generate tokens
            const tokens = JWTUtils.generateTokens(admin);

            const adminObject = admin.toObject();
            const { password, ...adminWithoutPassword } = adminObject;

            return { 
                admin: adminWithoutPassword, 
                tokens 
            };
        } catch (error) {
            throw error;
        }
    }


    static async getAdminsByRole(role: AdminRole) {
        try {
            return await Admin.find({ role })
                .select('-password')
                .sort({ createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    
    static async updateAdmin(id: string, data: UpdateAdminDto) {
        try {
            // Check if admin exists
            const admin = await Admin.findById(id);
            if (!admin) {
                throw new Error('Admin not found');
            }

            // If email is being updated, check for uniqueness
            if (data.email && data.email !== admin.email) {
                const existingAdmin = await Admin.findOne({ email: data.email });
                if (existingAdmin) {
                    throw new Error('Email already in use');
                }
            }

            // If password is included, hash it
            if (data.password) {
                data.password = await bcrypt.hash(data.password, 10);
            }

            // Update admin
            const updatedAdmin = await Admin.findByIdAndUpdate(
                id,
                { $set: data },
                { new: true }
            ).select('-password');

            if (!updatedAdmin) {
                throw new Error('Failed to update admin');
            }

            return updatedAdmin;
        } catch (error) {
            throw error;
        }
    }

    static async deleteAdmin(id: string) {
        try {
            // Check if admin exists
            const admin = await Admin.findById(id);
            if (!admin) {
                throw new Error('Admin not found');
            }

            // Prevent deletion of super_admin
            if (admin.role === 'super_admin') {
                throw new Error('Cannot delete super admin');
            }

            // Delete admin
            await Admin.findByIdAndDelete(id);
            return { message: 'Admin deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    static async toggleAdminStatus(id: string, data: any) {
        try {
            // Check if admin exists
            const admin = await Admin.findById(id);
            if (!admin) {
                throw new Error('Admin not found');
            }
    
            // Get current status and toggle it if isActive is not provided
            const newStatus = typeof data.isActive === 'boolean' ? data.isActive : !admin.isActive;
    
            // Prevent deactivation of super_admin
            if (admin.role === 'super_admin' && !newStatus) {
                throw new Error('Cannot deactivate super admin');
            }
    
            // Update status
            const updatedAdmin = await Admin.findByIdAndUpdate(
                id,
                { $set: { isActive: newStatus } },
                { new: true }
            ).select('-password');
    
            if (!updatedAdmin) {
                throw new Error('Failed to update admin status');
            }
    
            return updatedAdmin;
        } catch (error) {
            throw error;
        }
    }

}