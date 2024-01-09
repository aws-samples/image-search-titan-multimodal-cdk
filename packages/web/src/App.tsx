import React, { useState, useEffect } from 'react';
import ImageSelect from './components/ImageSelect';
import Results from './components/Results';
import Button from './components/Button';
import TextForm from './components/TextForm';

type ApiResponse = {
  imageName: string;
  score: number;
}[];

interface Props {
  apiUrlPrefix: string;
  imageStoreEndpoint: string;
}

const App: React.FC<Props> = ({ apiUrlPrefix, imageStoreEndpoint }) => {
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resizedImageURL, setResizedImageURL] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [encodedImage, setEncodedImage] = useState<string>('');

  const resizeAndCropImage =(
    file: File,
    pass: boolean,
    callback: (dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.src = e.target?.result as string;

      if (pass) {
        callback(image.src);
        return;
      }

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        let startX = 0;
        let startY = 0;
        let width = image.width;
        let height = image.height;

        if (width > height) {
          startX = (width - height) / 2;
          width = height;
        } else if (height > width) {
          startY = (height - width) / 2;
          height = width;
        }

        const newSize = 300;
        canvas.width = newSize;
        canvas.height = newSize;

        ctx?.drawImage(
          image,
          startX,
          startY,
          width,
          height,
          0,
          0,
          newSize,
          newSize
        );
        const newImageUrl = canvas.toDataURL(file.type, 0.99);

        callback(newImageUrl);
      };
    };

    reader.readAsDataURL(file);
  }

  useEffect(() => {
    // 1. read data from session storage
    const savedImageURL = sessionStorage.getItem('resizedImageURL');
    const savedApiResponse = sessionStorage.getItem('apiResponse');

    if (savedImageURL) {
      setResizedImageURL(savedImageURL);
    }
    if (savedApiResponse) {
      setApiResponse(JSON.parse(savedApiResponse));
    }
  }, []);

  useEffect(() => {
    // 2. save state in session storage when resizedImageURL state changes
    if (resizedImageURL) {
      sessionStorage.setItem('resizedImageURL', resizedImageURL);
    }
  }, [resizedImageURL]);

  useEffect(() => {
    // 3. save state in session storage when apiResponse state changes
    if (apiResponse) {
      sessionStorage.setItem('apiResponse', JSON.stringify(apiResponse));
    }
  }, [apiResponse]);


  const handleSearch = async () => {
    console.log(text.length, encodedImage.length);
    if (text.length > 0 || encodedImage.length > 0) {
      setIsProcessing(true);
      await fetch(`${apiUrlPrefix}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'x-api-key': 'YOUR_API_KEY', // If you have an API key
        },
        body: JSON.stringify({ b64_image: encodedImage, text: text }),
      })
        .then((response) => response.json())
        .then((data) => {
          setApiResponse(data);
        })
        .catch((error) => {
          console.log(error);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    } else {
      alert('画像かテキストの少なくとも一方を入力してください。');
    }
  };

  const handleClear = () => {
    setApiResponse(null);
    setIsProcessing(false);
    setResizedImageURL('');
    setEncodedImage('');
    setText('');
    sessionStorage.setItem('resizedImageURL', '');
    sessionStorage.setItem('apiResponse', '');
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setApiResponse(null);

    if (file) {
      resizeAndCropImage(file, false, async (newImageUrl) => {
        setResizedImageURL(newImageUrl);
        setEncodedImage(newImageUrl.split(',')[1]);
      });
    }
  };

  return (
    <div>
      <div className="query">
        <ImageSelect handleImageChange={handleImageChange} />
        <TextForm setText={setText} text={text} handleSubmit={handleSearch} />
        <p></p>

        <Button
          buttonName="Search"
          loading={isProcessing}
          onClick={handleSearch}
          disabled={!(text || encodedImage) || isProcessing}
        />
        <Button className="light" buttonName="Clear" onClick={handleClear} />

        <p></p>
        {resizedImageURL && (
          <img src={resizedImageURL} alt="Selected" width={'15%'} />
        )}
        {text.length > 0 && <p>Keywords: {text}</p>}
      </div>
      {isProcessing ? (
        <p className="processing-text">processing...</p>
      ) : (
        apiResponse && (
          <Results
            apiResponse={apiResponse}
            imageStoreEndpoint={imageStoreEndpoint}
          />
        )
      )}
    </div>
  );
};

export default App;
