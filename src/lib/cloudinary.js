import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.warn('⚠️ Cloudinary environment variables not fully configured')
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    })
}

/**
 * Upload image to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
export async function uploadImage(buffer, options = {}) {
    const {
        folder = 'ecom2',
        publicId = null,
        transformation = [],
    } = options

    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                {
                    resource_type: 'image',
                    folder,
                    public_id: publicId,
                    transformation: [
                        { quality: 'auto' },
                        { fetch_format: 'auto' },
                        ...transformation,
                    ],
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error)
                        reject(new Error(`Image upload failed: ${error.message}`))
                    } else {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                            width: result.width,
                            height: result.height,
                            format: result.format,
                        })
                    }
                }
            )
            .end(buffer)
    })
}

/**
 * Upload multiple images
 * @param {Buffer[]} files - Array of image buffers
 * @param {Object} options - Upload options
 */
export async function uploadMultipleImages(files, options = {}) {
    const uploads = files.map(file => uploadImage(file, options))
    return Promise.all(uploads)
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
export async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        return result.result === 'ok'
    } catch (error) {
        console.error('Cloudinary delete error:', error)
        return false
    }
}

/**
 * Delete multiple images
 * @param {string[]} publicIds - Array of Cloudinary public IDs
 */
export async function deleteMultipleImages(publicIds) {
    try {
        const result = await cloudinary.api.delete_resources(publicIds)
        return result
    } catch (error) {
        console.error('Cloudinary bulk delete error:', error)
        return null
    }
}

/**
 * Get optimized image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transform options
 */
export function getOptimizedImageUrl(publicId, options = {}) {
    const {
        width = 800,
        height = 600,
        crop = 'fill',
        quality = 'auto',
        format = 'auto',
    } = options

    return cloudinary.url(publicId, {
        transformation: [
            { width, height, crop },
            { quality },
            { fetch_format: format },
        ],
    })
}

/**
 * Generate thumbnail URL
 * @param {string} publicId - Cloudinary public ID
 * @param {number} size - Square size in pixels
 */
export function getThumbnailUrl(publicId, size = 150) {
    return cloudinary.url(publicId, {
        transformation: [
            { width: size, height: size, crop: 'fill' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
        ],
    })
}

export default cloudinary
