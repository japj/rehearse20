import * as dgram from 'dgram';
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import io from 'socket.io-client';

import * as serverConstants from './constants';
import DummyStreamer from './DummyStreamer';
import TrxStreamer from './TrxStreamer';
import * as actions from './actions';

const SOCKET_SERVER = `http://${serverConstants.SERVER_ADDRESS}:${serverConstants.HTTP_PORT}`;

const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get('name');
const sessionId = urlParams.get('sessionId') || 'default';
const startPort = 51352 + Math.floor(Math.random() * 1000);

const getFreePort = async (): Promise<number> => {
  return new Promise(async (resolve) => {
    const socket = dgram.createSocket('udp4');
    socket.bind({ port: 0, exclusive: true }, () => {
      const port = socket.address().port;
      socket.close();
      console.log('got port', port);
      resolve(port);
    });
  });
};

const getFreeEvenNumberedPort = async (): Promise<number> => {
  return new Promise(async (resolve) => {
    let port;
    do {
      port = await getFreePort();
    } while (port % 2 !== 0);
    resolve(port);
  });
};

const ports = new Map<number, number>();

const SocketConnection = (props) => {
  const dispatch = useDispatch();
  const volume = useSelector((state) => state.volume);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socket = subscribeToSocket();
    setSocket(socket);
    const unsubscribeBeforeUnload = (event) => {
      event.preventDefault();
      unsubscribeFromSocket(socket);
    };
    window.addEventListener('beforeunload', unsubscribeBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', unsubscribeBeforeUnload);
      unsubscribeFromSocket(socket);
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('mute microphone', { isMuted: volume.isMuted });
    }
  }, [volume.isMuted]);

  const subscribeToSocket = () => {
    const socket = io(SOCKET_SERVER, { transports: ['websocket'] });
    const streamer = new DummyStreamer();

    socket.on('connect', async () => {
      console.log('connected');
      socket.emit('identify', { name, sessionId }, (currentMembers) => {
        // console.log('currentMembers', currentMembers);
        dispatch(actions.clearMembers());
        currentMembers.forEach((member) => dispatch(actions.addMember(member)));
        socket.emit('start streaming');
      });
    });

    socket.on('disconnect', () => {
      console.log('disconnected');
      streamer.stop();
    });

    socket.on('chat message', (msg) => console.log('message:', msg));
    socket.on('user joined', ({ id, name }) => {
      console.log('user joined:', name, id);
      dispatch(actions.addMember({ id, name }));
    });
    socket.on('user left', ({ id, name }) => {
      console.log('user left:', name, id);
      dispatch(actions.removeMember({ id, name }));
    });

    socket.on('start sending', async ({ id, address, port, ssrc }) => {
      console.log(
        `starting to send to ${id} on ${address}:${port} with ${ssrc}`
      );
      let localPort = ports.get(ssrc);
      if (!localPort) {
        localPort = await getFreeEvenNumberedPort();
        ports.set(ssrc, localPort);
      }
      streamer.startSending(id, localPort, address, port, ssrc);
      dispatch(actions.startSending(id, address, port));
    });

    socket.on('stop sending', ({ id, address }) => {
      console.log(`stop sending to ${id} on ${address}`);
      streamer.stopSending(id, address);
      dispatch(actions.stopSending(id));
    });

    return socket;
  };

  const unsubscribeFromSocket = (socket) => {
    socket.disconnect();
  };

  return null; // no UI to render here
};

export default SocketConnection;
