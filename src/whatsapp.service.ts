// whatsapp.service.ts
import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
const qrcode = require('qrcode-terminal');
const fs = require('fs');

@Injectable()
export class WhatsappService {
  private client: Client;
  private activeClients: Map<string, NodeJS.Timeout>;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-gpu'],
      },
      webVersionCache: {
        type: 'remote',
        remotePath:
          'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      },
    });
    this.activeClients = new Map<string, NodeJS.Timeout>();
    this.initialize();
  }

  private initialize() {
    this.client.on('qr', (qr) => {
      // Maneja el código QR para iniciar sesión en WhatsApp Web
      console.log('Escanea el código QR:');
      qrcode.generate(qr, { small: true });
      console.log(qr);
    });

    this.client.on('ready', () => {
      console.log('Cliente de WhatsApp listo');
    });

    this.client.on('message', async (message) => {
      if (!message.isStatus) {
        // Verificar si el mensaje tiene medios adjuntos
        const phoneNumber = message.from;

        // Si el mensaje es "start", activa el bot para el cliente correspondiente
        if (message.body.toLowerCase() === 'start') {
          if (!this.activeClients.has(phoneNumber)) {
            this.activateBot(phoneNumber);
          } else {
            console.log('El bot ya está activo para este cliente.');
          }
        }

        // Si el mensaje proviene de un cliente activo, reinicia el temporizador de inactividad
        if (this.activeClients.has(phoneNumber)) {
          clearTimeout(this.activeClients.get(phoneNumber));
          this.resetInactivityTimer(phoneNumber);
        }

        // Crear el nombre de la carpeta utilizando el número de teléfono
        const folderName = `./conversaciones/${phoneNumber}`;
        // Verificar si la carpeta existe, si no, crearla
        if (!fs.existsSync(folderName)) {
          fs.mkdirSync(folderName);
        }
        if (message.hasMedia) {
          // Verificar el tipo de medio basado en las propiedades disponibles
          if (message.type === 'image') {
            const mediaData = await message.downloadMedia();
            // Guardar la imagen en el sistema de archivos local
            const fileName = `${folderName}/imagen_${Date.now()}.jpg`;
            //fs.writeFileSync(fileName, mediaData.data, 'binary'); // Guardar el archivo
            fs.writeFileSync(
              fileName,
              Buffer.from(mediaData.data, 'base64').toString('binary'),
              'binary',
            );
            console.log('Se recibió una imagen.');
          } else if (message.type === 'video') {
            console.log('Se recibió un video.');
          } else if (message.type === 'document') {
            if (message.body) {
              if (message.body.toLowerCase().includes('.pdf')) {
                console.log('Se recibió un archivo PDF.');
                const mediaData = await message.downloadMedia();
                // Guardar la imagen en el sistema de archivos local
                const fileName = `${folderName}/pdf_${Date.now()}.pdf`;
                //fs.writeFileSync(fileName, mediaData.data, 'binary'); // Guardar el archivo
                fs.writeFileSync(
                  fileName,
                  Buffer.from(mediaData.data, 'base64').toString('binary'),
                  'binary',
                );
                console.log(`Documento PDF descargado como ${fileName}`);
              } else {
                console.log('Se recibió un archivo de otro tipo.');
              }
            } else {
              console.log('Se recibió un documento sin cuerpo de mensaje.');
            }
          } else {
            console.log(
              'Se recibió un tipo de medio desconocido:',
              message.type,
            );
          }
        } else if (message.body) {
          if (message.body === 'Hola') {
            await this.client.sendMessage(message.from, '¡Hola!');
          }

          const textFileName = `${folderName}/mensajes.txt`;

          // Verificar si la carpeta existe, si no, crearla
          if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName);
          }

          // Guardar el mensaje de texto en el archivo
          const textoMensaje = `[${new Date().toISOString()}] ${
            message.body
          }\n`;
          fs.appendFile(textFileName, textoMensaje, () => {});
          // Si no tiene medios adjuntos, es un mensaje de texto
          console.log(
            'Se recibió un mensaje de texto: ',
            phoneNumber,
            ': ',
            message.body,
          );
        } else {
          console.log('Se recibió un mensaje de otro tipo.');
        }
      }
    });
    this.client.initialize();
  }
  private activateBot(phoneNumber: string) {
    console.log('Bot activado para el cliente:', phoneNumber);

    // Establece un temporizador para la inactividad del cliente
    const conversationTimeout = setTimeout(() => {
      this.deactivateBot(phoneNumber);
      console.log(
        'Bot desactivado debido a la inactividad del cliente:',
        phoneNumber,
      );
    }, 1 * 60 * 1000); // 5 minutos en milisegundos

    // Registra el temporizador para el cliente activo
    this.activeClients.set(phoneNumber, conversationTimeout);
  }

  private deactivateBot(phoneNumber: string) {
    // Limpia el temporizador de inactividad y elimina al cliente de la lista de activos
    clearTimeout(this.activeClients.get(phoneNumber));
    this.activeClients.delete(phoneNumber);
  }

  private resetInactivityTimer(phoneNumber: string) {
    // Reinicia el temporizador de inactividad para el cliente activo
    const conversationTimeout = setTimeout(() => {
      this.deactivateBot(phoneNumber);
      console.log(
        'Bot desactivado debido a la inactividad del cliente:',
        phoneNumber,
      );
    }, 1 * 60 * 1000); // 5 minutos en milisegundos

    // Actualiza el temporizador para el cliente activo
    this.activeClients.set(phoneNumber, conversationTimeout);
  }
}
