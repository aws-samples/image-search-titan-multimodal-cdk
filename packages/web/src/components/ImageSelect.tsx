type ImageSelectPropsType = {
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const ImageSelect = ({ handleImageChange }: ImageSelectPropsType) => {
  return (
    <input
      type="file"
      onChange={handleImageChange}
    />
  );
};

export default ImageSelect;
