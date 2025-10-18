// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getDownloadURL, getStorage, ref, uploadBytesResumable} from "firebase/storage";
import { get } from "http";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCI36xNr3RYblSt14n-XpA3wVOwBUqN_AU",
  authDomain: "lamina-dadc9.firebaseapp.com",
  projectId: "lamina-dadc9",
  storageBucket: "lamina-dadc9.firebasestorage.app",
  messagingSenderId: "459711790337",
  appId: "1:459711790337:web:9ac58caecc7bf798286f00"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export async function uploadFile(file:File, setProgress?:(progress:number)=>void){
    return new Promise((resolve, reject) => { 
        try {
            const storageRef = ref(storage, file.name);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (setProgress) setProgress(progress);
                switch (snapshot.state) {
                case 'paused':
                    console.log('Upload is paused');
                    break;
                case 'running':
                    console.log('Upload is running');
                    break;
                }
            }, 
            (error) => {
                reject(error);
                }, () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                });
            });
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}