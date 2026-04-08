// Student validators
import { CreateStudentData, UpdateStudentData } from './student.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class StudentValidators {
  static validateCreateData(data: CreateStudentData): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!data.userId?.trim()) {
      errors.push('User ID is required');
    }

    if (!data.schoolId?.trim()) {
      errors.push('School ID is required');
    }

    if (!data.firstName?.trim()) {
      errors.push('First name is required');
    } else if (data.firstName.length < 2) {
      errors.push('First name must be at least 2 characters');
    } else if (data.firstName.length > 50) {
      errors.push('First name must be less than 50 characters');
    }

    if (!data.lastName?.trim()) {
      errors.push('Last name is required');
    } else if (data.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters');
    } else if (data.lastName.length > 50) {
      errors.push('Last name must be less than 50 characters');
    }

    if (!data.email?.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (!data.dateOfBirth) {
      errors.push('Date of birth is required');
    } else if (!this.isValidDateOfBirth(data.dateOfBirth)) {
      errors.push('Invalid date of birth');
    }

    if (!data.grade?.trim()) {
      errors.push('Grade is required');
    }

    // Optional validations
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format');
    }

    if (data.address) {
      const addressErrors = this.validateAddress(data.address);
      errors.push(...addressErrors);
    }

    if (data.emergencyContact) {
      const contactErrors = this.validateEmergencyContact(data.emergencyContact);
      errors.push(...contactErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateUpdateData(data: UpdateStudentData): ValidationResult {
    const errors: string[] = [];

    // Optional field validations
    if (data.firstName !== undefined) {
      if (!data.firstName.trim()) {
        errors.push('First name cannot be empty');
      } else if (data.firstName.length < 2) {
        errors.push('First name must be at least 2 characters');
      } else if (data.firstName.length > 50) {
        errors.push('First name must be less than 50 characters');
      }
    }

    if (data.lastName !== undefined) {
      if (!data.lastName.trim()) {
        errors.push('Last name cannot be empty');
      } else if (data.lastName.length < 2) {
        errors.push('Last name must be at least 2 characters');
      } else if (data.lastName.length > 50) {
        errors.push('Last name must be less than 50 characters');
      }
    }

    if (data.email !== undefined) {
      if (!data.email.trim()) {
        errors.push('Email cannot be empty');
      } else if (!this.isValidEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.phone !== undefined && data.phone && !this.isValidPhone(data.phone)) {
      errors.push('Invalid phone number format');
    }

    if (data.grade !== undefined && !data.grade.trim()) {
      errors.push('Grade cannot be empty');
    }

    if (data.address) {
      const addressErrors = this.validateAddress(data.address);
      errors.push(...addressErrors);
    }

    if (data.emergencyContact) {
      const contactErrors = this.validateEmergencyContact(data.emergencyContact);
      errors.push(...contactErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateStudentId(id: string): boolean {
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static validateGrade(grade: string): boolean {
    const validGrades = [
      'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
      'Kindergarten', 'Pre-K', 'Nursery',
      'Freshman', 'Sophomore', 'Junior', 'Senior',
      'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'
    ];
    return validGrades.includes(grade);
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // International phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private static isValidDateOfBirth(date: Date): boolean {
    const now = new Date();
    const minAge = 3; // Minimum age 3 years
    const maxAge = 25; // Maximum age 25 years

    const age = now.getFullYear() - date.getFullYear();
    return age >= minAge && age <= maxAge && date <= now;
  }

  private static validateAddress(address: any): string[] {
    const errors: string[] = [];

    if (!address.street?.trim()) {
      errors.push('Street address is required');
    }

    if (!address.city?.trim()) {
      errors.push('City is required');
    }

    if (!address.state?.trim()) {
      errors.push('State is required');
    }

    if (!address.zipCode?.trim()) {
      errors.push('ZIP code is required');
    } else if (!/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      errors.push('Invalid ZIP code format');
    }

    if (!address.country?.trim()) {
      errors.push('Country is required');
    }

    return errors;
  }

  private static validateEmergencyContact(contact: any): string[] {
    const errors: string[] = [];

    if (!contact.name?.trim()) {
      errors.push('Emergency contact name is required');
    }

    if (!contact.relationship?.trim()) {
      errors.push('Emergency contact relationship is required');
    }

    if (!contact.phone?.trim()) {
      errors.push('Emergency contact phone is required');
    } else if (!this.isValidPhone(contact.phone)) {
      errors.push('Invalid emergency contact phone number');
    }

    if (contact.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid emergency contact email');
    }

    return errors;
  }

  static sanitizeStudentData(data: any): any {
    // Basic sanitization
    const sanitized = { ...data };

    if (sanitized.firstName) {
      sanitized.firstName = sanitized.firstName.trim();
    }

    if (sanitized.lastName) {
      sanitized.lastName = sanitized.lastName.trim();
    }

    if (sanitized.email) {
      sanitized.email = sanitized.email.trim().toLowerCase();
    }

    return sanitized;
  }
}
