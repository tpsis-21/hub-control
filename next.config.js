/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Node.js modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        child_process: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        url: false,
        querystring: false,
        path: false,
        http: false,
        https: false,
        zlib: false,
      }
      
      // Exclude nodemailer from client bundle
      config.externals = config.externals || []
      config.externals.push('nodemailer')
    }
    return config
  },
}

export default nextConfig