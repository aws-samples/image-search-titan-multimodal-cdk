type ApiResponse = {
  imageName: string;
  score: number;
}[];

type ResultsPropType = {
  apiResponse: ApiResponse | null;
  imageStoreEndpoint: string;
};

const Results = ({ apiResponse, imageStoreEndpoint }: ResultsPropType) => {

  return (
    <div className="flex-container caption">
      {apiResponse?.map((item, index) => (
        <div className="tile" key={index}>
          <div>
            {item.imageName.split('/').slice(-1)}
<br></br>
            Score: {item.score}
          </div>
          <img
            src={`https://${imageStoreEndpoint}/images/${item.imageName}`}
            alt={`${item.imageName}`}
            width={'100%'}
          />
        </div>
      ))}

    </div>
  );
};

export default Results;
