// Middleware para actualizar avatarUrl en sesión (sincronizar con BD)
app.use(async (req, res, next) => {
    try {
        if (req.session && req.session.usuario && req.session.usuario.id) {
            // Si avatarUrl no existe en sesión, buscarla en BD
            if (!req.session.usuario.avatarUrl) {
                const Usuario = require('./models/Usuario');
                const usuario = await Usuario.findById(req.session.usuario.id).select('avatarUrl');
                if (usuario && usuario.avatarUrl) {
                    req.session.usuario.avatarUrl = usuario.avatarUrl;
                    res.locals.usuario.avatarUrl = usuario.avatarUrl;
                }
            }
        }
    } catch (error) {
        console.error('Error actualizando avatarUrl:', error);
    }
    next();
});