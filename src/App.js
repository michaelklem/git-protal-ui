import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json';
import MuiAlert from "@material-ui/lab/Alert";
import { GiphyFetch } from "@giphy/js-fetch-api";
// import {
//   Carousel,
//   Gif,
//   Grid,
//   Video,
//   VideoOverlay
// } from "@giphy/react-components";
import Carousel from 'react-images';
import { ThemeProvider } from '@material-ui/styles';
import Modal from 'react-modal';
import FlatList from 'flatlist-react';


Modal.setAppElement("#root");
// use @giphy/js-fetch-api to fetch gifs, instantiate with your api key
const gf = new GiphyFetch('of7F1DUKYYNuLaXLkbwjoefjliF7CcWZ')


// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

function Alert(props) {
  return <MuiAlert elevation={6} 
                   variant="filled" {...props} />;
}
  

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [gifList, setGifList] = useState([]);
  const [fetchedGifs, setFetchedGifs] = useState([]);
  const [error, setError] = useState('');
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const selectJeffModal = () => {
    setModalIsOpen(true)
  }
  
  
  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } 
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
          <button 
            onClick={selectJeffModal}
            type="submit" 
            className="cta-button get-jeffs-button">
            Get some Jeffs and select your favorite!
          </button>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  
  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        setError('Solana object not found! Get a Phantom Wallet 👻')

      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async (inputValue) => {

    console.log('Jeff link:', inputValue);
    
    try {
      if (! isUnique(inputValue)) {
        console.log('Link is not unique!')
        setError('That Jeff has already been submitted. Please select another.')
        return
      }
      
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Selected Jeff successfully sent to program", inputValue)

      await getGifList();
    } catch (error) {
      console.log("Error sending Jeff:", error)
    }
  };

  // Returns true if the passed url does not exist in the 
  const isUnique = (url) => {
    let isUnique = true

    if (gifList.some(e => e.gifLink === url)) {
      isUnique = false
    }

    return isUnique
  }
  
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  //666
  const getGifsFromAPI = async() => {
    const fetchGifs = await gf.search("jeff goldblum", {offset:0, limit: 30 })
    console.log(`Got ${fetchGifs.data.length} records from giphy.`)
    let urls = []
    for(let image of fetchGifs.data) {
      console.log('image: ' + JSON.stringify(image.images.original.url))
      const source_url = `https://media2.giphy.com/media/${image.id}/giphy.gif`
      urls.push({source: source_url})
    }
    setFetchedGifs(urls)
  }

  const toggleModal = () => {
    setModalIsOpen(! modalIsOpen)
  }
  
  const imageSelected = (e) => {
    console.log('clicked ' + e.currentTarget.src)
    //666
    sendGif(e.currentTarget.src)
    setModalIsOpen(false)
  }
  
  
  const renderImage = (item, index) => {
    return (
      <div class='list-image'>
        {index+1}: <img src={item.source} onClick={imageSelected} />
      </div>
    )
  }
  
  const getGifList = async() => {
    try {
      getGifsFromAPI()
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifList: ", error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching Jeffs list...');
      getGifList()
    }
  }, [walletAddress]);
  return (
    <div className="App">
      {error && 
        <Alert severity="error">{error}</Alert>
      }

			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">The Jeff Goldblum Portal</p>
          <p className="sub-text">
            View the selected Jeffs in the metaverse ✨
          </p>
          {/* Add the condition to show this only if we don't have a wallet address */}
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}

          <Modal
            isOpen={modalIsOpen}
            onRequestClose={toggleModal}
            contentLabel="My dialog"
          >
            <FlatList
              list={fetchedGifs}
              renderItem={renderImage}
              renderWhenEmpty={() => <div>List is empty!</div>}
            />
            <button onClick={toggleModal}>Close modal</button>
          </Modal>
        </div>

        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;