require('picard');

picard.env = {
    root: process.cwd(),
    mode: 'development',
    port: 9900,
    public_dir: '/public',
    views: '/views'
};

picard.start();
