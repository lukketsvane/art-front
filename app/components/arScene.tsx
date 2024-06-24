"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

const ArScene: React.FC = () => {
  const [tags, setTags] = useState<{ position: [number, number, number], color: number }[]>([]);
  const reticle = useRef<THREE.Mesh>(null);

  useEffect(() => {
    socket.on('tag', (tag) => {
      setTags((prevTags) => [...prevTags, tag]);
    });

    return () => {
      socket.off('tag');
    };
  }, []);

  useEffect(() => {
    const handleSelect = () => {
      if (reticle.current && reticle.current.visible) {
        const color = Math.random() * 0xffffff;
        const position = [reticle.current.position.x, reticle.current.position.y, reticle.current.position.z] as [number, number, number];
        const newTag = { position, color };
        setTags((prevTags) => [...prevTags, newTag]);
        socket.emit('tag', newTag);
      }
    };

    const sessionInit = async () => {
      if (navigator.xr) {
        try {
          const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'] });
          const controller = renderer.xr.getController(0);
          controller.addEventListener('select', handleSelect);
          scene.add(controller);
          renderer.xr.setSession(session);
        } catch (e) {
          console.error('Failed to start AR session:', e);
        }
      } else {
        console.error('WebXR not supported');
      }
    };

    const { scene, renderer } = initializeScene();
    sessionInit();

    return () => {
      const controller = renderer.xr.getController(0);
      controller.removeEventListener('select', handleSelect);
      scene.remove(controller);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        {tags.map((tag, index) => (
          <mesh key={index} position={tag.position}>
            <cylinderGeometry args={[0.1, 0.1, 0.2, 32]} />
            <meshPhongMaterial color={tag.color} />
          </mesh>
        ))}
        <mesh ref={reticle} visible={false}>
          <ringGeometry args={[0.15, 0.2, 32]} />
          <meshBasicMaterial />
        </mesh>
      </Canvas>
    </div>
  );
};

const initializeScene = () => {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));
  return { scene, renderer };
};

export default ArScene;
