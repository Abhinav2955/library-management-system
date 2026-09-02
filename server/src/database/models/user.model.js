const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/db');

class User extends Model {
  toSafeJSON() {
    const { id, name, email, role, membershipStatus, phone, isEmailVerified, createdAt } = this;
    return { id, name, email, role, membershipStatus, phone, isEmailVerified, createdAt };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.ENUM('member', 'librarian', 'admin'),
      allowNull: false,
      defaultValue: 'member',
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    membershipStatus: {
      type: DataTypes.ENUM('active', 'suspended', 'expired'),
      allowNull: false,
      defaultValue: 'active',
      field: 'membership_status',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified',
    },
    failedLoginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_login_attempts',
    },
    lockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'locked_until',
    },
    emailVerificationTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_verification_token_hash',
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'email_verification_expires',
    },
    passwordResetTokenHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_reset_token_hash',
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
  }
);

module.exports = User;