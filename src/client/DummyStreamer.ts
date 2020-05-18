import { ChildProcess, execFile } from 'child_process';
import * as path from 'path';

class DummyStreamer {
  ticker: NodeJS.Timeout;
  streamers: Map<string, ChildProcess>;

  constructor() {
    this.streamers = new Map();
  }

  startSending(id, localPort, remoteAddress, remotePort, ssrc) {
    const child = this.trx(localPort, remoteAddress, remotePort, ssrc);
    child.on('close', (code) => {
      console.log(`trx exited with code ${code}`);
      this.streamers.delete(id);
      // console.log('streamers:', this.streamers.keys());
    });

    this.streamers.set(id, child);
    // console.log('streamers:', this.streamers.keys());
  }

  stopSending(id, address?) {
    const streamer = this.streamers.get(id);
    if (streamer) {
      streamer.kill();
    } else {
      console.log('??? No trx child?');
    }
  }

  stop() {
    this.streamers.forEach((child, id) => {
      this.stopSending(id);
    });
  }

  trx(localPort, remoteAddress, remotePort, ssrc) {
    // console.log('node', [
    //   path.join(__dirname, 'trx', 'dummy_trx.js'),
    //   localPort,
    //   remoteAddress,
    //   remotePort,
    //   ssrc,
    // ]);
    // const child = spawn('node', [
    //   path.join(__dirname, 'trx', 'dummy_trx.js'),
    //   localPort,
    //   remoteAddress,
    //   remotePort,
    //   ssrc,
    // ]);
    console.log(path.join(__dirname, 'trx', 'trx'), [
      '-p',
      localPort,
      '-h',
      remoteAddress,
      '-s',
      remotePort,
      '-S',
      ssrc,
    ].join(' '));
    // https://www.electronjs.org/docs/tutorial/application-packaging#executing-binaries-inside-asar-archive
    // only execFile is supported to execute binaries inside asar archive.
    const child = execFile(path.join(__dirname, 'trx', 'trx'), [
      '-p',
      localPort,
      '-h',
      remoteAddress,
      '-s',
      remotePort,
      '-S',
      ssrc,
    ]);
    child.stdout.on('data', (data) => console.log(data.toString()));
    child.stderr.on('data', (data) => console.error(data.toString()));
    return child;
  }
}

export default DummyStreamer;
