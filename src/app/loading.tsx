// src/app/loading.tsx
'use client';
import React from 'react';
import styles from '../styles/loading.module.css'; // Path yang diperbarui

const LoadingPage = () => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.dotContainer}>
        <div className={`${styles.dot} ${styles['dot-1']}`} />
        <div className={`${styles.dot} ${styles['dot-2']}`} />
        <div className={`${styles.dot} ${styles['dot-3']}`} />
      </div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
};

export default LoadingPage;