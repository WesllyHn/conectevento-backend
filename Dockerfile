# Dockerfile (dev) — ConectEvento
FROM node:20-alpine
 
# Instala OpenSSL (necessário para Prisma)
# Instala openssl e tenta instalar openssl1.1-compat se disponível
RUN apk add --no-cache openssl && \
    (apk add --no-cache openssl1.1-compat 2>/dev/null || true)
 
# Diretório de trabalho no container
WORKDIR /app
 
# Copia manifestos primeiro para melhor uso de cache
COPY package*.json ./
 
# Instala dependências
RUN npm ci || npm i
 
COPY prisma ./prisma
COPY src ./src

# gera o cliente Prisma
RUN npx prisma generate

# Copia o restante do código
COPY . .
 
# Porta da aplicação
EXPOSE 3000
 
# Comando padrão (usa script "dev" do package.json)
CMD ["npm", "run", "dev"]