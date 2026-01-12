-- Migration: Add address, logo, and logo_url columns to users table
-- Run this SQL script in your MySQL database

-- Add address column to users table
ALTER TABLE `users` 
ADD COLUMN `address` VARCHAR(255) NULL AFTER `school_address_city`;

-- Add logo column to users table
ALTER TABLE `users` 
ADD COLUMN `logo` VARCHAR(255) NULL AFTER `address`;

-- Add logo_url column to users table
ALTER TABLE `users` 
ADD COLUMN `logo_url` VARCHAR(255) NULL AFTER `logo`;

-- Make papers table columns nullable (for backward compatibility)
ALTER TABLE `papers` 
MODIFY COLUMN `school_name` VARCHAR(255) NULL;

ALTER TABLE `papers` 
MODIFY COLUMN `address` VARCHAR(255) NULL;

ALTER TABLE `papers` 
MODIFY COLUMN `logo` VARCHAR(255) NULL;

-- Add paper_title column to papers table (for templates)
ALTER TABLE `papers` 
ADD COLUMN `paper_title` VARCHAR(255) NULL AFTER `board`;

