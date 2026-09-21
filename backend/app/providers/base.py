from abc import ABC,abstractmethod
class AIProvider(ABC):
 @abstractmethod
 def generate_app_spec(self,query): raise NotImplementedError
