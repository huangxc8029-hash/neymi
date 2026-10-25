import type {NextConfig} from 'next';

const nextConfig:NextConfig={distDir:process.env.NEYMI_NEXT_DIST_DIR??'.next-neymi'};

export default nextConfig;
