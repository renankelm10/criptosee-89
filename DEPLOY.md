# Deploy to a VPS

This project is a Vite + React SPA. You can deploy it on any VPS either using Docker (recommended) or Nginx serving the static build.

## Option A) Docker (Nginx static server)

Prerequisites: Docker installed on your VPS.

1) Build the image
   docker build -t crypto-surge-radar:latest .

2) Run the container
   docker run -d --name crypto-surge-radar -p 80:80 crypto-surge-radar:latest

3) (Optional) Enable HTTPS with a reverse proxy or use Caddy/Traefik. For Nginx + Certbot, see Option B notes.

## Option B) Bare metal with Nginx

Prerequisites: Node.js 18+ for building, Nginx for serving.

1) Build the static files
   npm ci
   npm run build

2) Copy the build to your web root (example)
   sudo mkdir -p /var/www/crypto-surge-radar
   sudo cp -r dist/* /var/www/crypto-surge-radar/

3) Create an Nginx server block (as root)
   sudo tee /etc/nginx/sites-available/crypto-surge-radar <<'CONF'
   server {
     listen 80;
     server_name your-domain.com;
     root /var/www/crypto-surge-radar;
     index index.html;

     gzip on;
     gzip_comp_level 5;
     gzip_min_length 256;
     gzip_types text/plain application/json application/javascript text/css text/xml application/xml+rss image/svg+xml;

     location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|ttf)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
       try_files $uri =404;
     }

     location / {
       try_files $uri $uri/ /index.html;
     }

     error_page 404 =200 /index.html;
   }
   CONF

   sudo ln -s /etc/nginx/sites-available/crypto-surge-radar /etc/nginx/sites-enabled/crypto-surge-radar
   sudo nginx -t && sudo systemctl reload nginx

4) Add HTTPS (recommended)
   sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com -d www.your-domain.com

## Notes
- This is a client-only app; no server runtime is required in production.
- If serving under a subpath (e.g., /app), update Vite base in vite.config and rebuild.
- For firewall, open ports 80/443.
