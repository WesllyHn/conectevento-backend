const uploadService = require('../services/upload.service');

exports.uploadImageBase64 = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { fileName, mimeType, data } = req.body;

    if (!fileName || !mimeType || !data) {
      return res.status(400).json({ success: false, message: 'Payload inválido. Esperado fileName, mimeType e data (base64).' });
    }

    const buffer = Buffer.from(data, 'base64');
    const maxSize = 5 * 1024 * 1024;
    if (buffer.length > maxSize) {
      return res.status(413).json({ success: false, message: 'Arquivo muito grande. Máx 5MB.' });
    }

    const savedImage = await uploadService.saveImage({
      supplierId,
      fileBuffer: buffer,
      mimeType,
      fileName,
      fileSize: buffer.length,
    });

    return res.status(201).json({ success: true, data: savedImage });
  } catch (error) {
    console.error('Erro no upload base64:', error);
    return res.status(500).json({ success: false, message: 'Erro ao salvar imagem.' });
  }
};

exports.getImage = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    const image = await uploadService.getImageById(portfolioId);

    if (!image) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
    }

    const buffer = image.imageData instanceof Buffer ? image.imageData : Buffer.from(image.imageData);
    res.setHeader('Content-Type', image.mimeType);
    res.send(buffer);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar imagem.' });
  }
};

exports.getImagesBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const images = await uploadService.getImagesBySupplier(supplierId);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar imagens.' });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const { portfolioId } = req.params;
    
    const deleted = await uploadService.deleteImage(portfolioId);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Imagem não encontrada.' });
    }

    return res.status(200).json({ success: true, message: 'Imagem removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return res.status(500).json({ success: false, message: 'Erro ao deletar imagem.' });
  }
};