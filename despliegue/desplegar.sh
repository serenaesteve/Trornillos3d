#!/bin/bash
# Publica (o actualiza) Despiece en tornillos3d.serenaesteve.com. Se puede lanzar las veces que haga falta.
#   sudo bash despliegue/desplegar.sh
set -euo pipefail

DOMINIO=tornillos3d.serenaesteve.com
IP_SERVIDOR=82.165.244.40
ORIGEN=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DESTINO=/var/www/tornillos3d

# 1. Solo lo que necesita la web: ni las pruebas, ni las capturas, ni los documentos
install -d -m 755 "$DESTINO"
rsync -a --delete \
  --exclude '.git/' --exclude '.gitignore' --exclude 'despliegue/' --exclude 'pruebas/' \
  --exclude 'capturas/' --exclude '*.md' --exclude '__pycache__/' \
  --chown=root:www-data --chmod=D755,F644 "$ORIGEN/" "$DESTINO/"

# 2. Apache en el puerto 80 (redirección a HTTPS y verificación de Let's Encrypt)
install -m 644 "$ORIGEN/despliegue/tornillos3d.conf" /etc/apache2/sites-available/tornillos3d.conf
a2ensite -q tornillos3d.conf
apache2ctl -t 2>&1 | tail -1
systemctl reload apache2

# 3. HTTPS, solo cuando el DNS público apunte a este servidor (es lo que comprueba Let's Encrypt)
IP_DOMINIO=$(dig +short A "$DOMINIO" @1.1.1.1 | tail -1)
IPV6_DOMINIO=$(dig +short AAAA "$DOMINIO" @1.1.1.1 | tail -1)
if [ "$IP_DOMINIO" != "$IP_SERVIDOR" ] || [ -n "$IPV6_DOMINIO" ]; then
  echo "FALTA EL DNS: $DOMINIO tiene que tener un registro A con $IP_SERVIDOR y ningún AAAA."
  exit 0
fi

if [ ! -e "/etc/letsencrypt/live/$DOMINIO/fullchain.pem" ]; then
  certbot certonly --webroot -w /var/www/acme -d "$DOMINIO" --non-interactive --keep-until-expiring \
    --deploy-hook "systemctl reload apache2"
fi
install -m 644 "$ORIGEN/despliegue/tornillos3d-ssl.conf" /etc/apache2/sites-available/tornillos3d-ssl.conf
a2ensite -q tornillos3d-ssl.conf
apache2ctl -t 2>&1 | tail -1
systemctl reload apache2
sleep 1
echo "Publicado: https://$DOMINIO → $(curl -s -o /dev/null -m 10 --resolve "$DOMINIO:443:$IP_SERVIDOR" -w '%{http_code}' "https://$DOMINIO/")"
